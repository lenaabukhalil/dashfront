import { useEffect, useState, useCallback } from "react";
import { getRbacRoles, getRolePermissions, updateRolePermissions } from "@/services/api";
import type { RbacRole, RolePermissionItem } from "@/services/api";
import { ALL_PERMISSION_CODES, PERMISSION_LABELS } from "@/types/permissions";
import type { PermissionCode } from "@/types/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function RbacEditor() {
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [rolePerms, setRolePerms] = useState<Record<string, "R" | "RW" | "-">>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const isOwnerRole = selectedRoleId === 1;

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getRbacRoles();
      setRoles(list);
      if (list.length > 0 && selectedRoleId == null) setSelectedRoleId(list[0].role_id);
      else if (list.length > 0 && !list.some((r) => r.role_id === selectedRoleId))
        setSelectedRoleId(list[0].role_id);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load roles", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId, toast]);

  const loadPermissions = useCallback(
    async (roleId: number) => {
      setLoading(true);
      try {
        const list = await getRolePermissions(roleId);
        const map: Record<string, "R" | "RW" | "-"> = {};
        ALL_PERMISSION_CODES.forEach((code) => {
          map[code] = "-";
        });
        list.forEach((p) => {
          const access = (p.access === "RW" ? "RW" : "R") as "R" | "RW";
          if (ALL_PERMISSION_CODES.includes(p.code as PermissionCode)) map[p.code] = access;
        });
        setRolePerms(map);
      } catch (e) {
        toast({ title: "Error", description: "Failed to load permissions", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedRoleId != null) loadPermissions(selectedRoleId);
  }, [selectedRoleId, loadPermissions]);

  const handleSave = async () => {
    if (selectedRoleId == null || isOwnerRole) return;
    setSaving(true);
    try {
      const payload: Record<string, "R" | "RW"> = {};
      Object.entries(rolePerms).forEach(([code, access]) => {
        if (access === "R" || access === "RW") payload[code] = access;
      });
      await updateRolePermissions(selectedRoleId, payload);
      toast({ title: "Saved", description: "Role permissions updated successfully." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save permissions", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const setPerm = (code: string, value: "R" | "RW" | "-") => {
    setRolePerms((prev) => ({ ...prev, [code]: value }));
  };

  const selectedRole = roles.find((r) => r.role_id === selectedRoleId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={selectedRoleId != null ? String(selectedRoleId) : ""}
            onValueChange={(v) => setSelectedRoleId(Number(v))}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.role_id} value={String(r.role_id)}>
                  {r.role_name} {r.role_id === 1 ? "(read-only)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedRole && (
          <div className="space-y-2">
            <Label>Permissions for {selectedRole.role_name}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {ALL_PERMISSION_CODES.map((code) => (
                <div key={code} className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">{PERMISSION_LABELS[code] ?? code}</span>
                  <Select
                    value={rolePerms[code] ?? "-"}
                    onValueChange={(v) => setPerm(code, v as "R" | "RW" | "-")}
                    disabled={isOwnerRole || loading}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">None</SelectItem>
                      <SelectItem value="R">Read</SelectItem>
                      <SelectItem value="RW">Read/Write</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedRoleId != null && !isOwnerRole && (
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
