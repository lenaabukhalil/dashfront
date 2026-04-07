import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Users, Plus, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import {
  getPartnerUser,
  createPartnerUserV4,
  updatePartnerUser,
  deletePartnerUser,
  type PartnerUserRecord,
  type UpdatePartnerUserPayload,
} from "@/services/api";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useIonOrgUsers, ION_ORGANIZATION_ID } from "../hooks/useIonOrgUsers";

/** role_id → label & badge colors (per product spec). */
const ROLE_DISPLAY: Record<
  number,
  { label: string; className: string }
> = {
  1: {
    label: "Owner",
    className:
      "border-transparent bg-blue-600/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  },
  2: {
    label: "Admin",
    className:
      "border-transparent bg-purple-600/15 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
  },
  3: {
    label: "Engineer",
    className:
      "border-transparent bg-emerald-600/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  4: {
    label: "Accountant",
    className:
      "border-transparent bg-orange-600/15 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200",
  },
  5: {
    label: "Operator",
    className:
      "border-transparent bg-slate-500/15 text-slate-800 dark:bg-slate-400/20 dark:text-slate-300",
  },
};

const ROLE_SELECT_OPTIONS = [1, 2, 3, 4, 5].map((id) => ({
  value: String(id),
  label: ROLE_DISPLAY[id]?.label ?? `Role ${id}`,
}));

function RoleBadge({ roleId }: { roleId?: number }) {
  const id = Number(roleId);
  const cfg = ROLE_DISPLAY[id];
  if (!cfg) {
    return (
      <Badge variant="outline" className="font-medium tabular-nums">
        {roleId ?? "—"}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={cn("font-medium", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

interface IonUserFormState {
  f_name: string;
  l_name: string;
  mobile: string;
  email: string;
  role_id: number;
  password: string;
}

const emptyForm = (): IonUserFormState => ({
  f_name: "",
  l_name: "",
  mobile: "",
  email: "",
  role_id: 5,
  password: "",
});

interface IonOrganizationUsersTabProps {
  role: string | null;
}

export function IonOrganizationUsersTab({ role }: IonOrganizationUsersTabProps) {
  const { user } = useAuth();
  const r = user ? userTypeToRole(user.userType) : null;
  const { canWrite } = usePermission(r);
  const { users, loading, loadUsers } = useIonOrgUsers();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<IonUserFormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [loadingOne, setLoadingOne] = useState(false);

  const displayName = (u: PartnerUserRecord) => {
    const fn = (u.f_name ?? u.first_name ?? "").trim();
    const ln = (u.l_name ?? u.last_name ?? "").trim();
    return `${fn} ${ln}`.trim() || "—";
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = async (id: number) => {
    setEditingId(id);
    setLoadingOne(true);
    setDialogOpen(true);
    try {
      const row = await getPartnerUser(String(id));
      if (!row) {
        toast({ title: "Error", description: "User not found", variant: "destructive" });
        setDialogOpen(false);
        return;
      }
      const u = row as Record<string, unknown>;
      setForm({
        f_name: String(row.f_name ?? row.first_name ?? u.f_name ?? ""),
        l_name: String(row.l_name ?? row.last_name ?? u.l_name ?? ""),
        mobile: String(row.mobile ?? ""),
        email: String(row.email ?? u.email ?? ""),
        role_id: Number(row.role_id ?? u.role_id ?? 5),
        password: "",
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

  const validate = (): string | null => {
    if (!form.f_name.trim()) return "First name is required.";
    if (!form.l_name.trim()) return "Last name is required.";
    if (!form.mobile.trim() || form.mobile.length < 10) return "Mobile is required (min 10 characters).";
    if (!form.role_id || form.role_id < 1) return "Role is required.";
    if (!editingId && (!form.password || form.password.length < 8))
      return "Password is required (min 8 characters) for new users.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite("users.edit")) {
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
          first_name: form.f_name.trim(),
          last_name: form.l_name.trim(),
          f_name: form.f_name.trim(),
          l_name: form.l_name.trim(),
          mobile: form.mobile.trim(),
          role_id: form.role_id,
          email: form.email.trim() || undefined,
          user_type: "operator",
          subs_plan: "free",
          language: "en",
        };
        if (form.password.length >= 8) payload.password = form.password;
        await updatePartnerUser(String(editingId), payload);
        toast({ title: "Updated", description: "User updated successfully." });
      } else {
        await createPartnerUserV4({
          organization_id: ION_ORGANIZATION_ID,
          role_id: form.role_id,
          mobile: form.mobile.trim(),
          password: form.password,
          f_name: form.f_name.trim(),
          l_name: form.l_name.trim(),
          email: form.email.trim() || undefined,
          user_type: "operator",
          subs_plan: "free",
          language: "en",
          is_active: true,
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
    if (!canWrite("users.edit")) {
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

  return (
    <PermissionGuard
      role={role}
      permission="users.edit"
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
          <PermissionGuard role={role} permission="users.edit" action="write">
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
                      Email
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Role
                    </TableHead>
                    <TableHead className="h-14 px-4 text-right text-sm font-semibold text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow
                      key={u.user_id}
                      className="border-b border-[#f0f0f0] hover:bg-muted/20 dark:border-border"
                    >
                      <TableCell className="px-4 py-4 align-middle text-sm text-foreground">
                        {displayName(u)}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle text-sm text-foreground">
                        {u.mobile ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle text-sm text-foreground">
                        {u.email ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle">
                        <RoleBadge roleId={u.role_id} />
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right align-middle">
                        <PermissionGuard role={role} permission="users.edit" action="write">
                          <div className="flex items-center justify-end gap-4">
                            <button
                              type="button"
                              onClick={() => openEdit(u.user_id)}
                              className="inline-flex items-center gap-1.5 text-foreground/80 transition-colors hover:text-foreground"
                              aria-label="Edit user"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.5} />
                              <span className="text-sm">Edit</span>
                            </button>
                            <ConfirmDeleteDialog
                              entityLabel="user"
                              onConfirm={() => handleDelete(u.user_id)}
                            >
                              <button
                                type="button"
                                className="text-sm font-medium text-destructive hover:text-destructive/90 hover:underline"
                                aria-label="Remove user"
                              >
                                Remove
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/30 px-3 py-2">
                Organization ID is fixed to <span className="font-mono font-medium">{ION_ORGANIZATION_ID}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    Mobile <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.mobile}
                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                    placeholder="+962 ..."
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    Role <span className="text-destructive">*</span>
                  </Label>
                  <AppSelect
                    options={ROLE_SELECT_OPTIONS}
                    value={String(form.role_id)}
                    onChange={(v) => setForm((f) => ({ ...f, role_id: Number(v) }))}
                    placeholder="Select role"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    Password {editingId ? "(optional)" : <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={editingId ? "Leave blank to keep current" : "Min 8 characters"}
                  />
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
  );
}
