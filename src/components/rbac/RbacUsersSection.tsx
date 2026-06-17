import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchOrganizationsList,
  getRbacRoles,
  getRbacUsers,
  updateRbacUser,
} from "@/services/api";
import type { RbacManagedUser, RbacRoleItem } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppSelect } from "@/components/shared/AppSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PLATFORM_ADMIN_CODE } from "@/components/rbac/rbac-shared";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

type OrgScopeMode = "all" | "specific";

interface RbacUsersSectionProps {
  onUsersCount?: (count: number) => void;
}

export function RbacUsersSection({ onUsersCount }: RbacUsersSectionProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<RbacManagedUser[]>([]);
  const [roles, setRoles] = useState<RbacRoleItem[]>([]);
  const [organizations, setOrganizations] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [editUser, setEditUser] = useState<RbacManagedUser | null>(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [editScopeMode, setEditScopeMode] = useState<OrgScopeMode>("all");
  const [editOrgIds, setEditOrgIds] = useState<number[]>([]);
  const [orgSearch, setOrgSearch] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const editableRoles = useMemo(
    () => roles.filter((r) => r.code !== PLATFORM_ADMIN_CODE),
    [roles],
  );

  const orgNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const org of organizations) map.set(org.id, org.name);
    return map;
  }, [organizations]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiUnavailable(false);
    setLoadError(null);
    try {
      const [userRows, roleRows, orgRows] = await Promise.all([
        getRbacUsers(),
        getRbacRoles(),
        fetchOrganizationsList(),
      ]);
      setUsers(userRows);
      setRoles(roleRows);
      setOrganizations(orgRows);
      onUsersCount?.(userRows.length);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load users";
      if (message.includes("not available")) {
        setApiUnavailable(true);
      } else {
        setLoadError(message);
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [onUsersCount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const total = users.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageUsers = users.slice(start, end);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openEdit = (user: RbacManagedUser) => {
    if (user.role_code === PLATFORM_ADMIN_CODE) return;
    setEditUser(user);
    setEditRoleId(String(user.role_id));
    if (user.allowed_organization_ids === null) {
      setEditScopeMode("all");
      setEditOrgIds([]);
    } else {
      setEditScopeMode("specific");
      setEditOrgIds([...user.allowed_organization_ids]);
    }
    setOrgSearch("");
    setEditError(null);
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditUser(null);
    setEditError(null);
  };

  const filteredOrgs = useMemo(() => {
    const q = orgSearch.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((o) => o.name.toLowerCase().includes(q));
  }, [organizations, orgSearch]);

  const editOrgInvalid =
    editScopeMode === "specific" && editOrgIds.length === 0;

  const handleEditSave = async () => {
    if (!editUser || editSaving || editOrgInvalid) return;
    const roleId = Number(editRoleId);
    if (!Number.isFinite(roleId)) {
      setEditError("Select a valid role.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateRbacUser(editUser.user_id, {
        role_id: roleId,
        allowed_organization_ids: editScopeMode === "all" ? null : editOrgIds,
      });
      toast({ title: "User updated" });
      closeEdit();
      await loadData();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setEditSaving(false);
    }
  };

  const renderOrgScope = (user: RbacManagedUser) => {
    if (user.allowed_organization_ids === null) {
      return <span className="text-sm">All organizations</span>;
    }
    const count = user.allowed_organization_ids.length;
    const names = user.allowed_organization_ids
      .map((id) => orgNameById.get(id) ?? `Org #${id}`)
      .join(", ");
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="cursor-default">
            {count} organization{count === 1 ? "" : "s"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{names || "—"}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Card>
        <CardHeader>
          <CardTitle>User access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiUnavailable && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>User management API not available yet</AlertTitle>
              <AlertDescription>
                The RBAC users endpoint is not deployed. This table will populate automatically once the API is live.
              </AlertDescription>
            </Alert>
          )}

          {loadError && !apiUnavailable && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not load users</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !apiUnavailable ? (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                        Organizations Scope
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      pageUsers.map((user) => {
                        const isPlatformAdmin = user.role_code === PLATFORM_ADMIN_CODE;
                        const fullName =
                          `${user.f_name} ${user.l_name}`.trim() || user.email || user.mobile || "—";
                        return (
                          <tr
                            key={user.user_id}
                            className={cn(
                              "border-b last:border-0",
                              isPlatformAdmin && "bg-muted/30 text-muted-foreground",
                            )}
                          >
                            <td className="py-3 px-3">{fullName}</td>
                            <td className="py-3 px-3 break-all">{user.email || "—"}</td>
                            <td className="py-3 px-3">
                              <Badge variant="outline">{user.role_name || user.role_code}</Badge>
                            </td>
                            <td className="py-3 px-3">{renderOrgScope(user)}</td>
                            <td className="py-3 px-3 text-right">
                              {isPlatformAdmin ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                      <Lock className="h-3.5 w-3.5" />
                                      Locked
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Platform admins always see everything
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEdit(user)}
                                >
                                  Edit
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-foreground whitespace-nowrap">Items per page</span>
                    <div className="w-[72px] min-w-[72px]">
                      <AppSelect
                        options={PAGE_SIZE_OPTIONS}
                        value={String(pageSize)}
                        onChange={(v) => {
                          setPageSize(Number(v) || 10);
                          setPage(1);
                        }}
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                      {`${start + 1}–${end} of ${total}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={safePage <= 1}
                        onClick={() => setPage(1)}
                        aria-label="First page"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage(totalPages)}
                        aria-label="Last page"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={editUser != null} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit user access</DialogTitle>
            <DialogDescription>
              {editUser
                ? `${editUser.f_name} ${editUser.l_name}`.trim() || editUser.email
                : ""}
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              {editError && (
                <p className="text-sm text-destructive" role="alert">
                  {editError}
                </p>
              )}
              <div className="space-y-2">
                <Label>Role</Label>
                <AppSelect
                  options={editableRoles.map((r) => ({
                    value: String(r.id),
                    label: r.name,
                  }))}
                  value={editRoleId}
                  onChange={setEditRoleId}
                  placeholder="Select role"
                  isDisabled={editSaving}
                />
              </div>
              <div className="space-y-3">
                <Label>Organizations scope</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="org-scope"
                      checked={editScopeMode === "all"}
                      onChange={() => setEditScopeMode("all")}
                      disabled={editSaving}
                      className="accent-primary"
                    />
                    All organizations
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="org-scope"
                      checked={editScopeMode === "specific"}
                      onChange={() => setEditScopeMode("specific")}
                      disabled={editSaving}
                      className="accent-primary"
                    />
                    Specific organizations
                  </label>
                </div>
                {editScopeMode === "specific" && (
                  <div className="space-y-2 rounded-lg border p-3">
                    <Input
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      placeholder="Search organizations…"
                      disabled={editSaving}
                    />
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {filteredOrgs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No organizations match.</p>
                      ) : (
                        filteredOrgs.map((org) => {
                          const checked = editOrgIds.includes(org.id);
                          return (
                            <label
                              key={org.id}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => {
                                  setEditOrgIds((prev) =>
                                    value
                                      ? [...prev, org.id]
                                      : prev.filter((id) => id !== org.id),
                                  );
                                }}
                                disabled={editSaving}
                              />
                              <span className="truncate">{org.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    {editOrgInvalid && (
                      <p className="text-xs text-destructive">Select at least one organization</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEdit} disabled={editSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleEditSave}
              disabled={editSaving || editOrgInvalid || !editRoleId}
            >
              {editSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
