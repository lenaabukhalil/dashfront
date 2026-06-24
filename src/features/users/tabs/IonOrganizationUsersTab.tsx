import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AppSelect } from "@/components/shared/AppSelect";
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
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import {
  getPartnerUser,
  createPartnerUserV4,
  updatePartnerUser,
  deletePartnerUser,
  fetchRbacRoles,
  normalizePartnerUserMobile,
  type PartnerUserRecord,
  type RbacRoleRecord,
  type UpdatePartnerUserPayload,
} from "@/services/api";
import { usePermission } from "@/hooks/usePermission";
import { useIonOrgUsers, ION_ORGANIZATION_ID } from "../hooks/useIonOrgUsers";
import { partnerUserRoleLabel } from "@/lib/partner-user-role";
import { partnerUserRowKey, resolvePartnerUserId } from "@/lib/partner-user-helpers";
import {
  PARTNER_USER_TYPES,
  validPartnerUserType,
  type PartnerUserType,
} from "@/lib/partner-user-type";

const toStringSafe = (v: unknown): string =>
  v == null ? "" : typeof v === "string" ? v : String(v);

/** TODO: Confirm role_id values against your DB if API is unreachable. */
const FALLBACK_RBAC_ROLES: RbacRoleRecord[] = [
  { role_id: 1, role_name: "Super Admin" },
  { role_id: 2, role_name: "Admin" },
  { role_id: 3, role_name: "Operator" },
  { role_id: 4, role_name: "Accountant" },
];

function isPlatformAdminRole(role: RbacRoleRecord): boolean {
  const name = role.role_name.trim().toLowerCase();
  return name === "super admin" || name === "platform admin" || name.includes("platform admin");
}

function getAssignableRoles(roles: RbacRoleRecord[]): RbacRoleRecord[] {
  const source = roles.length ? roles : FALLBACK_RBAC_ROLES;
  return source.filter((r) => !isPlatformAdminRole(r));
}

function getDefaultRoleId(roles: RbacRoleRecord[]): number {
  return getAssignableRoles(roles)[0]?.role_id ?? 0;
}

const SUBS_PLANS = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
  { value: "premium_plus", label: "Premium Plus" },
] as const;

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
];

const validSubsPlan = (v: string | null | undefined): "free" | "premium" | "premium_plus" =>
  v && ["free", "premium", "premium_plus"].includes(v) ? (v as "free" | "premium" | "premium_plus") : "free";

const ION_ORG_SELECT_OPTION = [{ value: String(ION_ORGANIZATION_ID), label: "ION" }];

function RoleBadge({ user }: { user: PartnerUserRecord }) {
  return (
    <Badge variant="outline" className="font-medium">
      {partnerUserRoleLabel(user)}
    </Badge>
  );
}

interface IonUserFormState {
  f_name: string;
  l_name: string;
  mobile: string;
  email: string;
  role_id: number;
  user_type: PartnerUserType;
  subs_plan: "free" | "premium" | "premium_plus";
  language: string;
  password: string;
  is_active: boolean;
  profile_img_url: string;
  provider_user_id: string;
}

const emptyForm = (): IonUserFormState => ({
  f_name: "",
  l_name: "",
  mobile: "",
  email: "",
  role_id: 0,
  user_type: "operator",
  subs_plan: "free",
  language: "en",
  password: "",
  is_active: true,
  profile_img_url: "",
  provider_user_id: "",
});

interface IonOrganizationUsersTabProps {
  role: string | null;
}

export function IonOrganizationUsersTab({ role }: IonOrganizationUsersTabProps) {
  const { canWrite } = usePermission(role);
  const { users, loading, loadUsers } = useIonOrgUsers();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<IonUserFormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [loadingOne, setLoadingOne] = useState(false);
  const [rbacRoles, setRbacRoles] = useState<RbacRoleRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchRbacRoles()
      .then((rows) => {
        if (!cancelled) setRbacRoles(rows?.length ? rows : FALLBACK_RBAC_ROLES);
      })
      .catch(() => {
        if (!cancelled) setRbacRoles(FALLBACK_RBAC_ROLES);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const roleSelectOptions = useMemo(
    () =>
      getAssignableRoles(rbacRoles).map((r) => ({
        value: String(r.role_id),
        label: r.role_name,
      })),
    [rbacRoles],
  );

  const displayName = (u: PartnerUserRecord) => {
    const fn = toStringSafe(u.f_name ?? u.first_name).trim();
    const ln = toStringSafe(u.l_name ?? u.last_name).trim();
    return `${fn} ${ln}`.trim() || "—";
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), role_id: getDefaultRoleId(rbacRoles) });
    setDialogOpen(true);
  };

  const openEdit = async (id: number) => {
    if (!Number.isFinite(id) || id < 1) {
      toast({ title: "Error", description: "Invalid user id", variant: "destructive" });
      return;
    }
    setEditingId(id);
    setLoadingOne(true);
    setDialogOpen(true);
    try {
      const row = await getPartnerUser(String(id));
      if (!row) {
        toast({ title: "Error", description: "User not found", variant: "destructive" });
        setEditingId(null);
        setDialogOpen(false);
        return;
      }
      const u = row as Record<string, unknown>;
      setForm({
        f_name: toStringSafe(row.f_name ?? row.first_name ?? u.f_name),
        l_name: toStringSafe(row.l_name ?? row.last_name ?? u.l_name),
        mobile: toStringSafe(row.mobile),
        email: toStringSafe(row.email ?? u.email),
        role_id: Number(row.role_id ?? u.role_id ?? getDefaultRoleId(rbacRoles)),
        user_type: validPartnerUserType(
          toStringSafe((row as { user_type?: string }).user_type ?? u.user_type),
        ),
        subs_plan: validSubsPlan(
          toStringSafe((row as { subs_plan?: string }).subs_plan ?? u.subs_plan),
        ),
        language: toStringSafe((row as { language?: string }).language ?? u.language ?? "en"),
        password: "",
        is_active: ((row as { is_active?: number }).is_active ?? u.is_active ?? 1) === 1,
        profile_img_url: toStringSafe(
          (row as { profile_img_url?: string }).profile_img_url ?? u.profile_img_url,
        ),
        provider_user_id: toStringSafe(
          (row as { provider_user_id?: string }).provider_user_id ?? u.provider_user_id,
        ),
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to load user",
        variant: "destructive",
      });
      setEditingId(null);
      setDialogOpen(false);
    } finally {
      setLoadingOne(false);
    }
  };

  const validate = (): string | null => {
    const fNameStr = toStringSafe(form.f_name);
    const lNameStr = toStringSafe(form.l_name);
    const mobileStr = toStringSafe(form.mobile);
    if (!fNameStr.trim()) return "First name is required.";
    if (!lNameStr.trim()) return "Last name is required.";
    const mobileDigits = normalizePartnerUserMobile(mobileStr.trim(), 962);
    if (!mobileDigits || mobileDigits.length < 7) {
      return "Mobile is required (at least 7 digits).";
    }
    if (!form.role_id || form.role_id < 1) return "Role is required.";
    const uType = validPartnerUserType(toStringSafe(form.user_type));
    if (!PARTNER_USER_TYPES.some((t) => t.value === uType)) return "Invalid user type.";
    const sPlan = validSubsPlan(toStringSafe(form.subs_plan));
    if (!SUBS_PLANS.some((p) => p.value === sPlan)) return "Invalid subscription plan.";
    if (!editingId && (!form.password || form.password.length < 8))
      return "Password is required (min 8 characters) for new users.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite("users.manage")) {
      toast({ title: "Permission Denied", variant: "destructive" });
      return;
    }
    const err = validate();
    if (err) {
      toast({ title: "Validation", description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        const payload: UpdatePartnerUserPayload = {
          organization_id: ION_ORGANIZATION_ID,
          first_name: toStringSafe(form.f_name).trim(),
          last_name: toStringSafe(form.l_name).trim(),
          f_name: toStringSafe(form.f_name).trim(),
          l_name: toStringSafe(form.l_name).trim(),
          mobile: toStringSafe(form.mobile).trim(),
          role_id: form.role_id,
          email: toStringSafe(form.email).trim() || undefined,
          user_type: validPartnerUserType(toStringSafe(form.user_type)),
          subs_plan: validSubsPlan(toStringSafe(form.subs_plan)),
          language: toStringSafe(form.language),
          is_active: form.is_active,
          profile_img_url: toStringSafe(form.profile_img_url).trim() || undefined,
          provider_user_id: toStringSafe(form.provider_user_id).trim() || undefined,
        };
        if (form.password.length >= 8) payload.password = form.password;
        await updatePartnerUser(String(editingId), payload);
        toast({ title: "Updated", description: "User updated successfully." });
      } else {
        await createPartnerUserV4({
          organization_id: ION_ORGANIZATION_ID,
          role_id: form.role_id,
          mobile: toStringSafe(form.mobile).trim(),
          country_code: 962,
          password: form.password,
          f_name: toStringSafe(form.f_name).trim(),
          l_name: toStringSafe(form.l_name).trim(),
          email: toStringSafe(form.email).trim() || undefined,
          user_type: validPartnerUserType(toStringSafe(form.user_type)),
          subs_plan: validSubsPlan(toStringSafe(form.subs_plan)),
          language: toStringSafe(form.language),
          is_active: form.is_active,
          profile_img_url: toStringSafe(form.profile_img_url).trim() || undefined,
          provider_user_id: toStringSafe(form.provider_user_id).trim() || undefined,
        });
        toast({ title: "Created", description: "User created successfully." });
      }
      setDialogOpen(false);
      await loadUsers();
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
    if (!Number.isFinite(id) || id < 1) {
      toast({ title: "Error", description: "Invalid user id", variant: "destructive" });
      return;
    }
    if (!canWrite("users.manage")) {
      toast({ title: "Permission Denied", variant: "destructive" });
      return;
    }
    const result = await deletePartnerUser(String(id));
    if (result.success) {
      toast({ title: "Removed", description: result.message ?? "User removed." });
      await loadUsers();
    } else {
      toast({ title: "Remove failed", description: result.message, variant: "destructive" });
    }
  };

  const promptMissingUserId = () => {
    toast({
      title: "Error",
      description: "User id is missing for this row.",
      variant: "destructive",
    });
  };

  return (
    <PermissionGuard
      role={role}
      permission="users.view"
      action="read"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to view organization users."
          />
        </div>
      }
    >
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3 min-w-0">
            <Users className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
            <div className="space-y-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                Users in ION Organization
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Manage dashboard users for ION (organization ID {ION_ORGANIZATION_ID}).
              </p>
            </div>
          </div>
          <PermissionGuard role={role} permission="users.manage" action="write">
            <Button
              type="button"
              onClick={openCreate}
              className="shrink-0 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add user
            </Button>
          </PermissionGuard>
        </div>

        {loading ? (
          <p className="text-muted-foreground py-10 text-center text-sm">Loading users...</p>
        ) : users.length === 0 ? (
          <EmptyState
            title="No users"
            description="No users found for this organization. Add a user to get started."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-background dark:border-border">
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-[#f0f0f0] bg-[#fafafa] hover:bg-[#fafafa] dark:border-border dark:bg-muted/30 dark:hover:bg-muted/30">
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Name
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Mobile
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Role
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Type
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Email
                    </TableHead>
                    <TableHead className="h-14 px-4 text-right text-sm font-semibold text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, index) => (
                    <TableRow
                      key={partnerUserRowKey(u, index)}
                      className="border-b border-[#f0f0f0] hover:bg-muted/20 dark:border-border"
                    >
                      <TableCell className="px-4 py-4 align-middle text-sm text-foreground">
                        {displayName(u)}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle text-sm text-foreground">
                        {u.mobile ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle">
                        <RoleBadge user={u} />
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle text-sm text-muted-foreground">
                        {u.user_type ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle text-sm text-foreground">
                        {u.email ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right align-middle">
                        <PermissionGuard role={role} permission="users.manage" action="write">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const id = resolvePartnerUserId(u);
                                if (id == null) {
                                  promptMissingUserId();
                                  return;
                                }
                                void openEdit(id);
                              }}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              aria-label="Edit user"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <ConfirmDeleteDialog
                              entityLabel="user"
                              onConfirm={() => {
                                const id = resolvePartnerUserId(u);
                                if (id == null) {
                                  promptMissingUserId();
                                  return;
                                }
                                void handleDelete(id);
                              }}
                            >
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-muted text-red-400 hover:text-red-600"
                                aria-label="Remove user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </ConfirmDeleteDialog>
                          </div>
                        </PermissionGuard>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <PermissionGuard role={role} permission="users.manage" action="write">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit user" : "Add user"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update this ION organization user. Leave password blank to keep the current password."
                : "Create a user in ION Organization. Password must be at least 8 characters."}
            </DialogDescription>
          </DialogHeader>
          {loadingOne ? (
            <p className="py-4 text-muted-foreground">Loading...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Organization <span className="text-destructive">*</span>
                  </Label>
                  <AppSelect
                    options={ION_ORG_SELECT_OPTION}
                    value={String(ION_ORGANIZATION_ID)}
                    onChange={() => {}}
                    placeholder="ION"
                    isDisabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    First name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.f_name}
                    onChange={(e) => setForm((f) => ({ ...f, f_name: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Last name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.l_name}
                    onChange={(e) => setForm((f) => ({ ...f, l_name: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Mobile <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.mobile}
                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                    placeholder="+962 ..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Role <span className="text-destructive">*</span>
                  </Label>
                  <AppSelect
                    options={roleSelectOptions}
                    value={form.role_id >= 1 ? String(form.role_id) : ""}
                    onChange={(v) => setForm((f) => ({ ...f, role_id: Number(v) || 0 }))}
                    placeholder="Select role"
                    isDisabled={roleSelectOptions.length === 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    User type <span className="text-destructive">*</span>
                  </Label>
                  <AppSelect
                    options={PARTNER_USER_TYPES.map((o) => ({ value: o.value, label: o.label }))}
                    value={form.user_type}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, user_type: v as IonUserFormState["user_type"] }))
                    }
                    placeholder="User type"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subscription plan</Label>
                  <AppSelect
                    options={SUBS_PLANS.map((o) => ({ value: o.value, label: o.label }))}
                    value={form.subs_plan}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, subs_plan: v as IonUserFormState["subs_plan"] }))
                    }
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
                  <Label>
                    Password{" "}
                    {editingId ? "(optional)" : <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={editingId ? "Leave blank to keep current" : "Min 8 characters"}
                  />
                </div>
                <div className="space-y-2 flex items-center gap-2 md:col-span-2">
                  <Switch
                    id="ion_user_is_active"
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  />
                  <Label htmlFor="ion_user_is_active">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      </PermissionGuard>
    </PermissionGuard>
  );
}
