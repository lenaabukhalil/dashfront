import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/shared/AppSelect";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import {
  listPartnerUsers,
  getPartnerUser,
  createPartnerUserV4,
  updatePartnerUser,
  deletePartnerUser,
  type PartnerUserRecord,
  type CreatePartnerUserPayload,
  type UpdatePartnerUserPayload,
} from "@/services/api";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";

const USER_TYPES = [
  { value: "admin", label: "Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "operator", label: "Operator" },
] as const;

const SUBS_PLANS = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
  { value: "premium_plus", label: "Premium Plus" },
] as const;

const ROLE_OPTIONS = [
  { value: 1, label: "Admin" },
  { value: 2, label: "Manager" },
  { value: 3, label: "Engineer" },
  { value: 4, label: "Operator" },
  { value: 5, label: "Accountant" },
];

const LANGUAGE_OPTIONS = [
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
];

const VALID_USER_TYPES = ["admin", "accountant", "operator"] as const;
const validUserType = (v: string | null | undefined): "admin" | "accountant" | "operator" =>
  (v && VALID_USER_TYPES.includes(v as (typeof VALID_USER_TYPES)[number])) ? (v as "admin" | "accountant" | "operator") : "operator";
const validSubsPlan = (v: string | null | undefined): "free" | "premium" | "premium_plus" =>
  (v && ["free", "premium", "premium_plus"].includes(v)) ? (v as "free" | "premium" | "premium_plus") : "free";

const emptyForm = (): CreatePartnerUserPayload => ({
  organization_id: 0,
  f_name: "",
  l_name: "",
  mobile: "",
  role_id: 4,
  user_type: "operator",
  email: "",
  language: "en",
  subs_plan: "free",
  profile_img_url: "",
  provider_user_id: "",
  password: "",
  is_active: true,
  firebase_messaging_token: "",
  device_id: "",
});

interface PartnerUsersTabProps {
  role: string | null;
  orgOptions: { value: string; label: string }[];
  loadingOrg: boolean;
}

export function PartnerUsersTab({
  role,
  orgOptions,
  loadingOrg,
}: PartnerUsersTabProps) {
  const { user } = useAuth();
  const r = user ? userTypeToRole(user.userType) : null;
  const { canWrite } = usePermission(r);

  const [users, setUsers] = useState<PartnerUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreatePartnerUserPayload>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [loadingOne, setLoadingOne] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPartnerUsers();
      setUsers(list ?? []);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to load partner users",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreate = () => {
    setEditingId(null);
    const firstOrgId = orgOptions[0] ? Number(orgOptions[0].value) || 0 : 0;
    setForm({ ...emptyForm(), organization_id: firstOrgId });
    setDialogOpen(true);
  };

  const openEdit = async (id: number) => {
    setEditingId(id);
    setLoadingOne(true);
    setDialogOpen(true);
    try {
      const user = await getPartnerUser(String(id));
      if (!user) {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive",
        });
        setDialogOpen(false);
        return;
      }
      const u = user as Record<string, unknown>;
      setForm({
        organization_id: (user.organization_id ?? u.organization_id as number) ?? 0,
        f_name: (user.first_name ?? user.f_name ?? u.f_name ?? "") as string,
        l_name: (user.last_name ?? user.l_name ?? u.l_name ?? "") as string,
        mobile: (user.mobile ?? "") as string,
        role_id: (user.role_id ?? u.role_id ?? 4) as number,
        user_type: validUserType((user as { user_type?: string }).user_type ?? (u.user_type as string) ?? "operator"),
        email: (user.email ?? u.email ?? "") as string,
        language: ((user as { language?: string }).language ?? u.language ?? "en") as string,
        subs_plan: validSubsPlan((user as { subs_plan?: string }).subs_plan ?? (u.subs_plan as string) ?? "free"),
        profile_img_url: ((user as { profile_img_url?: string }).profile_img_url ?? u.profile_img_url ?? "") as string,
        provider_user_id: ((user as { provider_user_id?: string }).provider_user_id ?? u.provider_user_id ?? "") as string,
        password: "",
        is_active: ((user as { is_active?: number }).is_active ?? u.is_active ?? 1) === 1,
        firebase_messaging_token: ((user as { firebase_messaging_token?: string }).firebase_messaging_token ?? u.firebase_messaging_token ?? "") as string,
        device_id: ((user as { device_id?: string }).device_id ?? u.device_id ?? "") as string,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to load user",
        variant: "destructive",
      });
      setDialogOpen(false);
    } finally {
      setLoadingOne(false);
    }
  };

  const validateCreate = (): string | null => {
    if (!form.organization_id || form.organization_id < 1) return "Organization is required.";
    if (!form.f_name?.trim()) return "First name is required.";
    if (!form.l_name?.trim()) return "Last name is required.";
    if (!form.mobile?.trim() || form.mobile.length < 10) return "Mobile is required (min 10 characters).";
    if (!form.role_id || form.role_id < 1) return "Role is required.";
    const uType = validUserType(form.user_type);
    if (!USER_TYPES.some((t) => t.value === uType)) return "Invalid user type.";
    const sPlan = validSubsPlan(form.subs_plan);
    if (!SUBS_PLANS.some((p) => p.value === sPlan)) return "Invalid subscription plan.";
    if (!editingId && (!form.password || form.password.length < 8)) return "Password is required (min 8 characters) for new users.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite("users.edit")) {
      toast({ title: "Permission Denied", variant: "destructive" });
      return;
    }
    const err = validateCreate();
    if (err) {
      toast({ title: "Validation", description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        const payload: UpdatePartnerUserPayload = {
          organization_id: form.organization_id,
          first_name: form.f_name.trim(),
          last_name: form.l_name.trim(),
          f_name: form.f_name.trim(),
          l_name: form.l_name.trim(),
          mobile: form.mobile.trim(),
          role_id: form.role_id,
          user_type: validUserType(form.user_type),
          email: form.email?.trim() || undefined,
          language: form.language,
          subs_plan: validSubsPlan(form.subs_plan),
          profile_img_url: form.profile_img_url?.trim() || undefined,
          provider_user_id: form.provider_user_id?.trim() || undefined,
          is_active: form.is_active,
          firebase_messaging_token: form.firebase_messaging_token?.trim() || undefined,
          device_id: form.device_id?.trim() || undefined,
        };
        if (form.password && form.password.length >= 8) payload.password = form.password;
        await updatePartnerUser(String(editingId), payload);
        toast({ title: "Updated", description: "Partner user updated successfully." });
      } else {
        await createPartnerUserV4({
          ...form,
          f_name: form.f_name.trim(),
          l_name: form.l_name.trim(),
          mobile: form.mobile.trim(),
          user_type: validUserType(form.user_type),
          subs_plan: validSubsPlan(form.subs_plan),
          password: form.password,
        });
        toast({ title: "Created", description: "Partner user created successfully." });
      }
      setDialogOpen(false);
      loadUsers();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canWrite("users.edit")) {
      toast({ title: "Permission Denied", variant: "destructive" });
      return;
    }
    const result = await deletePartnerUser(String(id));
    if (result.success) {
      toast({ title: "Deleted", description: result.message });
      loadUsers();
    } else {
      toast({ title: "Delete failed", description: result.message, variant: "destructive" });
    }
  };

  const formatDate = (v: string | null | undefined) => {
    if (!v) return "—";
    try {
      const d = new Date(v);
      return isNaN(d.getTime()) ? v : d.toLocaleString();
    } catch {
      return v;
    }
  };

  return (
    <PermissionGuard
      role={role}
      permission="users.edit"
      action="read"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to view partner users."
          />
        </div>
      }
    >
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Partner Users</h2>
          <PermissionGuard role={role} permission="users.edit" action="write">
            <Button onClick={openCreate} disabled={loadingOrg}>
              <Plus className="w-4 h-4 mr-2" />
              Add Partner User
            </Button>
          </PermissionGuard>
        </div>

        {loading ? (
          <p className="text-muted-foreground py-8 text-center">Loading partner users...</p>
        ) : users.length === 0 ? (
          <EmptyState
            title="No partner users"
            description="Add your first partner user to get started."
          />
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Org ID</TableHead>
                  <TableHead>First / Last</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>{u.user_id}</TableCell>
                    <TableCell>{u.organization_id}</TableCell>
                    <TableCell>{(u.f_name ?? u.first_name ?? "")} {(u.l_name ?? u.last_name ?? "")}</TableCell>
                    <TableCell>{u.mobile}</TableCell>
                    <TableCell>{u.role_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.user_type ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>{u.subs_plan ?? "—"}</TableCell>
                    <TableCell>{u.email ?? "—"}</TableCell>
                    <TableCell>{(u.is_active ?? 1) === 1 ? "Yes" : "No"}</TableCell>
                    <TableCell>{u.language ?? "—"}</TableCell>
                    <TableCell>{formatDate(u.last_login_at)}</TableCell>
                    <TableCell className="text-right">
                      <PermissionGuard role={role} permission="users.edit" action="write">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u.user_id)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <ConfirmDeleteDialog
                            entityLabel="partner user"
                            onConfirm={() => handleDelete(u.user_id)}
                          >
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </ConfirmDeleteDialog>
                        </div>
                      </PermissionGuard>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Partner User" : "Add Partner User"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update partner user. Leave password blank to keep current."
                : "Create a new partner user. Password required (min 8 characters)."}
            </DialogDescription>
          </DialogHeader>
          {loadingOne ? (
            <p className="py-4 text-muted-foreground">Loading user...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization <span className="text-destructive">*</span></Label>
                  <AppSelect
                    options={orgOptions ?? []}
                    value={String(form.organization_id)}
                    onChange={(v) => setForm((f) => ({ ...f, organization_id: Number(v) || 0 }))}
                    placeholder="Select organization"
                    isDisabled={loadingOrg || !!editingId}
                  />
                </div>
                <div className="space-y-2">
                  <Label>First name <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.f_name}
                    onChange={(e) => setForm((f) => ({ ...f, f_name: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last name <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.l_name}
                    onChange={(e) => setForm((f) => ({ ...f, l_name: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.mobile}
                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                    placeholder="+971 50 000 0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role <span className="text-destructive">*</span></Label>
                  <AppSelect
                    options={ROLE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                    value={String(form.role_id)}
                    onChange={(v) => setForm((f) => ({ ...f, role_id: Number(v) }))}
                    placeholder="Select role"
                  />
                </div>
                <div className="space-y-2">
                  <Label>User type <span className="text-destructive">*</span></Label>
                  <AppSelect
                    options={USER_TYPES.map((o) => ({ value: o.value, label: o.label }))}
                    value={form.user_type || "operator"}
                    onChange={(v) => setForm((f) => ({ ...f, user_type: v as "admin" | "accountant" | "operator" }))}
                    placeholder="User type"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subscription plan</Label>
                  <AppSelect
                    options={SUBS_PLANS.map((o) => ({ value: o.value, label: o.label }))}
                    value={form.subs_plan || "free"}
                    onChange={(v) => setForm((f) => ({ ...f, subs_plan: v as "free" | "premium" | "premium_plus" }))}
                    placeholder="Plan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <AppSelect
                    options={LANGUAGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    value={form.language}
                    onChange={(v) => setForm((f) => ({ ...f, language: v }))}
                    placeholder="Language"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password {editingId ? "(optional)" : <span className="text-destructive">*</span>}</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={editingId ? "Leave blank to keep current" : "Min 8 characters"}
                  />
                </div>
                <div className="space-y-2 flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Profile image URL</Label>
                  <Input
                    value={form.profile_img_url ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, profile_img_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provider user ID</Label>
                  <Input
                    value={form.provider_user_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, provider_user_id: e.target.value }))}
                    placeholder="Defaults to mobile if empty"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Firebase messaging token</Label>
                  <Input
                    value={form.firebase_messaging_token ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, firebase_messaging_token: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Device ID</Label>
                  <Input
                    value={form.device_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, device_id: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
