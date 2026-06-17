import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createRbacRole,
  getRbacRoles,
  getRolePermissions,
  updateRolePermissions,
} from "@/services/api";
import type { RbacAllowedPermission, RbacRoleItem } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSelect } from "@/components/shared/AppSelect";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RbacPermissionSwitches } from "@/components/rbac/RbacPermissionSwitches";
import {
  PLATFORM_ADMIN_CODE,
  GLOBAL_ACCESS_KEY,
  ROLE_CODE_PATTERN,
  buildSwitchState,
  defaultSwitchState,
} from "@/components/rbac/rbac-shared";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";

interface RbacRolesSectionProps {
  allowedPermissions: RbacAllowedPermission[];
  permissionsLoading: boolean;
  onEditableRolesCount?: (count: number) => void;
}

export function RbacRolesSection({
  allowedPermissions,
  permissionsLoading,
  onEditableRolesCount,
}: RbacRolesSectionProps) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RbacRoleItem[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [switchState, setSwitchState] = useState<Record<string, boolean>>({});
  const [savedState, setSavedState] = useState<Record<string, boolean>>({});
  const [bootLoading, setBootLoading] = useState(true);
  const [permsLoading, setPermsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createCode, setCreateCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createSwitchState, setCreateSwitchState] = useState<Record<string, boolean>>({});
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const editableRoles = useMemo(
    () => roles.filter((r) => r.code !== PLATFORM_ADMIN_CODE),
    [roles],
  );

  const creatablePermissions = useMemo(
    () => allowedPermissions.filter((p) => p.key !== GLOBAL_ACCESS_KEY),
    [allowedPermissions],
  );

  const dirty = useMemo(() => {
    if (!allowedPermissions.length) return false;
    return allowedPermissions.some((p) => switchState[p.key] !== savedState[p.key]);
  }, [allowedPermissions, switchState, savedState]);

  const applyRolePermissions = useCallback(
    (rolePermissions: Record<string, boolean>) => {
      const next = buildSwitchState(allowedPermissions, rolePermissions);
      setSwitchState(next);
      setSavedState(next);
    },
    [allowedPermissions],
  );

  const loadRoles = useCallback(async (selectCode?: string) => {
    const roleList = await getRbacRoles();
    setRoles(roleList);
    if (selectCode) {
      setSelectedCode(selectCode);
      return;
    }
    if (!selectedCode) {
      const firstEditable = roleList.find((r) => r.code !== PLATFORM_ADMIN_CODE);
      if (firstEditable) setSelectedCode(firstEditable.code);
    }
  }, [selectedCode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBootLoading(true);
      try {
        const roleList = await getRbacRoles();
        if (cancelled) return;
        setRoles(roleList);
        const editableCount = roleList.filter((r) => r.code !== PLATFORM_ADMIN_CODE).length;
        onEditableRolesCount?.(editableCount);
        const firstEditable = roleList.find((r) => r.code !== PLATFORM_ADMIN_CODE);
        if (firstEditable) setSelectedCode(firstEditable.code);
      } catch (e) {
        if (!cancelled) {
          toast({
            title: "Error",
            description: e instanceof Error ? e.message : "Failed to load RBAC data",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast, onEditableRolesCount]);

  useEffect(() => {
    if (!creatablePermissions.length) return;
    setCreateSwitchState(defaultSwitchState(creatablePermissions));
  }, [creatablePermissions]);

  useEffect(() => {
    if (!selectedCode || !allowedPermissions.length) return;
    let cancelled = false;
    (async () => {
      setPermsLoading(true);
      try {
        const detail = await getRolePermissions(selectedCode);
        if (cancelled) return;
        applyRolePermissions(detail.permissions);
      } catch (e) {
        if (!cancelled) {
          toast({
            title: "Error",
            description: e instanceof Error ? e.message : "Failed to load role permissions",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setPermsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCode, allowedPermissions, applyRolePermissions, toast]);

  const resetCreateForm = () => {
    setCreateCode("");
    setCreateName("");
    setCreateDescription("");
    setCreateSwitchState(defaultSwitchState(creatablePermissions));
    setCreateError(null);
  };

  const openCreateDialog = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const createCodeValid = ROLE_CODE_PATTERN.test(createCode.trim());
  const createNameValid = createName.trim().length > 0;

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const code = createCode.trim();
    const name = createName.trim();
    if (!ROLE_CODE_PATTERN.test(code)) {
      setCreateError("Code must be 3–50 characters, start with a letter, and use lowercase letters, numbers, or underscores only.");
      return;
    }
    if (!name) {
      setCreateError("Name is required.");
      return;
    }
    setCreateSaving(true);
    try {
      const permissions = Object.fromEntries(
        creatablePermissions.map((p) => [p.key, createSwitchState[p.key] === true]),
      ) as Record<string, boolean>;
      const created = await createRbacRole({
        code,
        name,
        description: createDescription.trim(),
        permissions,
      });
      toast({ title: "Role created" });
      setCreateOpen(false);
      await loadRoles(created.code);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setCreateSaving(false);
    }
  };

  const confirmRoleSwitch = (code: string) => {
    setPendingCode(null);
    setDiscardOpen(false);
    setSelectedCode(code);
  };

  const handleRoleChange = (code: string) => {
    if (!code || code === selectedCode) return;
    if (dirty) {
      setPendingCode(code);
      setDiscardOpen(true);
      return;
    }
    setSelectedCode(code);
  };

  const handleSave = async () => {
    if (!selectedCode || permsLoading || saving) return;
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        allowedPermissions.map((p) => [p.key, switchState[p.key] === true]),
      ) as Record<string, boolean>;
      await updateRolePermissions(selectedCode, payload);
      setSavedState({ ...switchState });
      toast({ title: "Role permissions updated" });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to save permissions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = editableRoles.find((r) => r.code === selectedCode);
  const saveDisabled = !selectedCode || bootLoading || permissionsLoading || permsLoading || saving;
  const switchesLoading = bootLoading || permissionsLoading || permsLoading;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
          <CardTitle>Role permissions</CardTitle>
          <Button type="button" size="sm" onClick={openCreateDialog} disabled={bootLoading}>
            <Plus className="mr-2 h-4 w-4" />
            New Role
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Role</Label>
            {bootLoading ? (
              <Skeleton className="h-10 w-full max-w-md" />
            ) : (
              <>
                <AppSelect
                  options={editableRoles.map((r) => ({
                    value: r.code,
                    label: r.name,
                  }))}
                  value={selectedCode}
                  onChange={handleRoleChange}
                  placeholder="Select role"
                  isDisabled={bootLoading || permsLoading}
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground">platform_admin cannot be modified</p>
              </>
            )}
          </div>

          {selectedRole && (
            <div className="space-y-4">
              <Label>Permissions for {selectedRole.name}</Label>
              <RbacPermissionSwitches
                permissions={allowedPermissions}
                switchState={switchState}
                onChange={(key, checked) =>
                  setSwitchState((prev) => ({ ...prev, [key]: checked }))
                }
                disabled={permsLoading || saving}
                loading={switchesLoading}
              />
            </div>
          )}

          <Button onClick={handleSave} disabled={saveDisabled}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!createSaving) {
            setCreateOpen(open);
            if (!open) resetCreateForm();
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Create role</DialogTitle>
              <DialogDescription>
                Define a new custom role and its default permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {createError && (
                <p className="text-sm text-destructive" role="alert">
                  {createError}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="rbac-create-code">Code</Label>
                <Input
                  id="rbac-create-code"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toLowerCase())}
                  placeholder="org_manager"
                  autoComplete="off"
                  disabled={createSaving}
                />
                <p className="text-xs text-muted-foreground">
                  lowercase letters, numbers, underscores
                </p>
                {createCode.length > 0 && !createCodeValid && (
                  <p className="text-xs text-destructive">
                    Must start with a letter and be 3–50 characters (a-z, 0-9, _).
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rbac-create-name">Name</Label>
                <Input
                  id="rbac-create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Organization Manager"
                  disabled={createSaving}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rbac-create-description">Description (optional)</Label>
                <Input
                  id="rbac-create-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Manages organization settings"
                  disabled={createSaving}
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <RbacPermissionSwitches
                  permissions={creatablePermissions}
                  switchState={createSwitchState}
                  onChange={(key, checked) =>
                    setCreateSwitchState((prev) => ({ ...prev, [key]: checked }))
                  }
                  disabled={createSaving}
                  loading={bootLoading || permissionsLoading}
                  excludeKeys={[GLOBAL_ACCESS_KEY]}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSaving || !createCodeValid || !createNameValid}
              >
                {createSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved permission changes. Switching roles will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCode(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingCode && confirmRoleSwitch(pendingCode)}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
