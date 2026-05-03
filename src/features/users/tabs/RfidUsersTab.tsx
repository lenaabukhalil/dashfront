import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Info,
  MoreVertical,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import {
  getRfidUser,
  createRfidUser,
  updateRfidUser,
  deleteRfidUser,
  toggleRfidUser,
  listLocationsByOrg,
  type RfidUserRecord,
  type RfidAccessScope,
  type CreateRfidUserPayload,
  type UpdateRfidUserPayload,
} from "@/services/api";
import { useRfidUsers } from "@/features/users/hooks/useRfidUsers";
import { usePermission } from "@/hooks/usePermission";

const RFID_UID_RE = /^[A-F0-9]{4,32}$/;

/**
 * Validates if a string is a valid hexadecimal RFID UID
 * Valid: 4-32 characters, only A-F and 0-9
 */
const isValidHexUID = (uid: string | null | undefined): boolean => {
  if (!uid) return false;
  const trimmed = uid.trim().toUpperCase();
  return /^[A-F0-9]{4,32}$/.test(trimmed);
};

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

function isPortaledSelectMenuTarget(node: EventTarget | null | undefined): boolean {
  if (!(node instanceof Element)) return false;
  return Boolean(
    node.closest(".react-select__menu") ||
      node.closest(".react-select__menu-portal") ||
      node.closest('[class*="react-select"]') ||
      node.closest(".app-select__menu") ||
      node.closest(".app-select__menu-portal") ||
      node.closest('[class*="app-select"]'),
  );
}

function getOutsideEventTarget(
  event: { target: EventTarget | null; detail?: { originalEvent?: Event } },
): EventTarget | null {
  const orig = event.detail?.originalEvent;
  if (orig && "target" in orig && orig.target) return orig.target as EventTarget;
  return event.target;
}

function formatRelativeSession(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const t = d.getTime();
  if (!Number.isFinite(t)) return "Never";
  const diffSec = Math.round((t - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const hr = Math.round(diffSec / 3600);
  if (Math.abs(hr) < 24) return rtf.format(hr, "hour");
  const day = Math.round(diffSec / 86400);
  if (Math.abs(day) < 7) return rtf.format(day, "day");
  const week = Math.round(diffSec / (86400 * 7));
  if (Math.abs(week) < 5) return rtf.format(week, "week");
  const month = Math.round(diffSec / (86400 * 30));
  if (Math.abs(month) < 12) return rtf.format(month, "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

function fullDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : "";
}

function orgCell(u: RfidUserRecord): string {
  const n = u.organization_name != null ? String(u.organization_name).trim() : "";
  if (n) return n;
  return `#${u.organization_id}`;
}

function StatusPill({ status }: { status: "active" | "blocked" }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">
      Blocked
    </span>
  );
}

function effectiveAccessScope(u: RfidUserRecord): RfidAccessScope {
  const s = u.access_scope;
  if (s === "locations" || s === "none" || s === "organization") return s;
  return "organization";
}

function normalizeAllowedLocationIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

function accessScopeTooltipText(u: RfidUserRecord): string {
  const names = u.allowed_locations_names != null ? String(u.allowed_locations_names).trim() : "";
  if (names) return names;
  const ids = u.allowed_locations;
  if (Array.isArray(ids) && ids.length > 0) return ids.map((n) => String(n)).join(", ");
  return "—";
}

function AccessScopeCell({ u }: { u: RfidUserRecord }) {
  const scope = effectiveAccessScope(u);
  if (scope === "organization") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
        Whole organization
      </span>
    );
  }
  if (scope === "none") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        No access
      </span>
    );
  }
  const n = Array.isArray(u.allowed_locations) ? u.allowed_locations.length : 0;
  const label = `${n} location${n === 1 ? "" : "s"}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-pre-wrap">
        {accessScopeTooltipText(u)}
      </TooltipContent>
    </Tooltip>
  );
}

type FormState = {
  rfid_uid: string;
  organization_id: number;
  status: "active" | "blocked";
  access_scope: RfidAccessScope;
  allowed_locations: number[];
};

const emptyForm = (orgId: number): FormState => ({
  rfid_uid: "",
  organization_id: orgId,
  status: "active",
  access_scope: "organization",
  allowed_locations: [],
});

interface RfidUsersTabProps {
  role: string | null;
  orgOptions: { value: string; label: string }[];
  loadingOrg: boolean;
}

export function RfidUsersTab({ role, orgOptions, loadingOrg }: RfidUsersTabProps) {
  const { canWrite } = usePermission();
  const canRwRfid = canWrite("rfid.edit");
  const { users, loading, loadUsers, filters, setFilters } = useRfidUsers();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(0));
  const [submitting, setSubmitting] = useState(false);
  const [loadingOne, setLoadingOne] = useState(false);
  const [rfidUidError, setRfidUidError] = useState<string | null>(null);
  const [toggleBusyId, setToggleBusyId] = useState<number | null>(null);
  const [disableDialogId, setDisableDialogId] = useState<number | null>(null);
  const [blockDialogId, setBlockDialogId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orgLocations, setOrgLocations] = useState<Array<{ location_id: number; name: string }>>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsSelectionError, setLocationsSelectionError] = useState<string | null>(null);

  const orgFilterOptions = [{ value: "", label: "All organizations" }, ...(orgOptions ?? [])];
  const statusFilterOptions = [
    { value: "", label: "All" },
    { value: "active", label: "Active" },
    { value: "blocked", label: "Blocked" },
  ];

  const hasNonDefaultFilters =
    filters.organizationId !== "" || filters.status !== "" || filters.q !== "";

  const validHexUsers = users.filter((user) => isValidHexUID(user.rfid_uid));
  const searchQ = filters.q.trim().toLowerCase();
  const filtered = searchQ
    ? validHexUsers.filter((user) => {
        const uid = String(user.rfid_uid ?? "").toLowerCase();
        return uid.includes(searchQ);
      })
    : validHexUsers;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = filtered.slice(start, end);

  useEffect(() => {
    setPage(1);
  }, [filters.organizationId, filters.status, filters.q]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const clearFilters = () => {
    setFilters({ organizationId: "", status: "", q: "" });
  };

  const firstOrgId = orgOptions[0] ? Number(orgOptions[0].value) || 0 : 0;

  useEffect(() => {
    if (!dialogOpen || form.organization_id < 1 || form.access_scope !== "locations") {
      setOrgLocations([]);
      setLocationsLoading(false);
      return;
    }
    let cancelled = false;
    setLocationsLoading(true);
    void listLocationsByOrg(form.organization_id)
      .then((list) => {
        if (!cancelled) setOrgLocations(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setOrgLocations([]);
          toast({
            title: "Failed to load locations",
            description: err instanceof Error ? err.message : "Could not load locations for this organization.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLocationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, form.organization_id, form.access_scope]);

  const openCreate = () => {
    setEditingId(null);
    setRfidUidError(null);
    setLocationsSelectionError(null);
    setForm(emptyForm(firstOrgId));
    setDialogOpen(true);
  };

  const openEdit = async (id: number) => {
    setEditingId(id);
    setRfidUidError(null);
    setLocationsSelectionError(null);
    setLoadingOne(true);
    setDialogOpen(true);
    try {
      const row = await getRfidUser(id);
      if (!row) {
        toast({ title: "Error", description: "RFID user not found", variant: "destructive" });
        setDialogOpen(false);
        return;
      }
      const scope = effectiveAccessScope(row);
      const locIds = normalizeAllowedLocationIds(row.allowed_locations ?? null);
      setForm({
        rfid_uid: String(row.rfid_uid ?? "").toUpperCase(),
        organization_id: row.organization_id,
        status: row.status === "blocked" ? "blocked" : "active",
        access_scope: scope,
        allowed_locations: scope === "locations" ? locIds : [],
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to load RFID user",
        variant: "destructive",
      });
      setDialogOpen(false);
    } finally {
      setLoadingOne(false);
    }
  };

  const validateForm = (): string | null => {
    const uid = form.rfid_uid.trim().toUpperCase();
    if (!RFID_UID_RE.test(uid)) return "RFID UID must be 4–32 hex characters (A–F, 0–9).";
    if (!form.organization_id || form.organization_id < 1) return "Organization is required.";
    if (form.access_scope === "locations" && form.allowed_locations.length === 0) {
      return "Select at least one location for “Specific locations”.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRwRfid) {
      toast({ title: "Permission Denied", variant: "destructive" });
      return;
    }
    setRfidUidError(null);
    setLocationsSelectionError(null);
    const err = validateForm();
    if (err) {
      if (form.access_scope === "locations" && form.allowed_locations.length === 0) {
        setLocationsSelectionError("Select at least one location.");
      }
      toast({ title: "Validation", description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const locIdsForPayload =
        form.access_scope === "locations"
          ? form.allowed_locations.map((n) => Number(n)).filter((n) => Number.isFinite(n))
          : null;
      if (editingId) {
        const payload: UpdateRfidUserPayload = {
          rfid_uid: form.rfid_uid.trim().toUpperCase(),
          organization_id: form.organization_id,
          status: form.status,
          access_scope: form.access_scope,
          allowed_locations: locIdsForPayload,
        };
        const res = await updateRfidUser(editingId, payload);
        if (!res.success) {
          toast({ title: "Error", description: res.message, variant: "destructive" });
          return;
        }
        toast({ title: "Updated", description: res.message });
      } else {
        const payload: CreateRfidUserPayload = {
          rfid_uid: form.rfid_uid.trim().toUpperCase(),
          organization_id: form.organization_id,
          access_scope: form.access_scope,
          allowed_locations: locIdsForPayload,
        };
        const res = await createRfidUser(payload);
        if (!res.success) {
          if (res.duplicate) {
            setRfidUidError("This RFID UID is already registered.");
            return;
          }
          toast({ title: "Error", description: res.message, variant: "destructive" });
          return;
        }
        toast({ title: "Created", description: res.message });
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
    if (!canRwRfid) {
      toast({ title: "Permission Denied", variant: "destructive" });
      return;
    }
    const res = await deleteRfidUser(id);
    if (res.success) {
      toast({ title: "Deleted", description: res.message });
      loadUsers();
    } else {
      toast({ title: "Delete failed", description: res.message, variant: "destructive" });
    }
  };

  const runToggleEnable = useCallback(
    async (id: number, enabled: boolean) => {
      if (!canRwRfid) {
        toast({ title: "Permission Denied", variant: "destructive" });
        return;
      }
      setToggleBusyId(id);
      try {
        const res = await toggleRfidUser(id, enabled);
        if (!res.success) {
          toast({ title: "Error", description: res.message, variant: "destructive" });
          return;
        }
        toast({ title: enabled ? "Enabled" : "Disabled", description: res.message });
        loadUsers();
      } finally {
        setToggleBusyId(null);
      }
    },
    [canRwRfid, loadUsers],
  );

  const runBlockUser = async (id: number) => {
    if (!canRwRfid) {
      toast({ title: "Permission Denied", variant: "destructive" });
      return;
    }
    const res = await updateRfidUser(id, { status: "blocked" });
    setBlockDialogId(null);
    if (!res.success) {
      toast({ title: "Error", description: res.message, variant: "destructive" });
      return;
    }
    toast({ title: "Blocked", description: res.message });
    loadUsers();
  };

  return (
    <PermissionGuard
      role={role}
      permission="rfid.edit"
      action="read"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to view RFID users."
          />
        </div>
      }
    >
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3 min-w-0">
            <CreditCard className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
            <div className="space-y-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground tracking-tight">RFID Users</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                End-users who tap an RFID card on a charger. Manage cards and access.
              </p>
            </div>
          </div>
          <PermissionGuard role={role} permission="rfid.edit" action="write">
            <Button
              onClick={openCreate}
              disabled={loadingOrg}
              className="shrink-0 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add RFID User
            </Button>
          </PermissionGuard>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <Input
              placeholder="Search UID"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 min-w-[200px] flex-1">
            <Label className="text-xs text-muted-foreground">Organization</Label>
            <AppSelect
              options={orgFilterOptions}
              value={filters.organizationId}
              onChange={(v) => setFilters((f) => ({ ...f, organizationId: v }))}
              placeholder="All organizations"
              isDisabled={loadingOrg}
            />
          </div>
          <div className="space-y-1.5 min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <AppSelect
              options={statusFilterOptions}
              value={filters.status}
              onChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  status: (v === "active" || v === "blocked" ? v : "") as "" | "active" | "blocked",
                }))
              }
              placeholder="All"
            />
          </div>
          {hasNonDefaultFilters && (
            <button
              type="button"
              className="text-sm text-primary hover:underline self-end lg:mb-2"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-muted-foreground py-10 text-center text-sm">Loading RFID users...</p>
        ) : total === 0 ? (
          <EmptyState
            title="No RFID users"
            description="Register your first RFID card to get started."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-background dark:border-border">
            <div className="text-xs text-muted-foreground mb-2 px-1 flex items-center gap-1">
              <Info className="w-3 h-3" />
              <span>Showing only RFID cards with valid hexadecimal UIDs (4-32 chars, A-F and 0-9)</span>
            </div>
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-[#f0f0f0] bg-[#fafafa] hover:bg-[#fafafa] dark:border-border dark:bg-muted/30 dark:hover:bg-muted/30">
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Org ID
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">User ID</TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">RFID UID</TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Organization
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">Access</TableHead>
                    <TableHead className="h-14 px-4 text-right text-sm font-semibold text-foreground">Sessions</TableHead>
                    <TableHead className="h-14 px-4 text-right text-sm font-semibold text-foreground">Energy (kWh)</TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">Last Session</TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">Status</TableHead>
                    <TableHead className="h-14 px-4 text-right text-sm font-semibold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((u) => {
                    const blocked = u.status === "blocked";
                    return (
                      <TableRow
                        key={u.id}
                        className={`border-b border-[#f0f0f0] hover:bg-muted/20 dark:border-border ${blocked ? "opacity-60" : ""}`}
                      >
                        <TableCell className="px-4 py-4 align-middle text-sm text-foreground tabular-nums">
                          {u.organization_id}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle text-sm text-foreground tabular-nums font-mono">
                          {u.id}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono tracking-wider uppercase text-sm text-foreground">
                              {u.rfid_uid}
                            </span>
                            {blocked && (
                              <span className="text-[10px] font-semibold uppercase text-red-600 dark:text-red-400">
                                Blocked
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle text-sm text-foreground">{orgCell(u)}</TableCell>
                        <TableCell className="px-4 py-4 align-middle">
                          <AccessScopeCell u={u} />
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle text-sm text-foreground text-right tabular-nums">
                          {u.sessions_count}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle text-sm text-foreground text-right tabular-nums">
                          {Number(u.total_kwh).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle text-sm text-foreground">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default border-b border-dotted border-muted-foreground/50">
                                {formatRelativeSession(u.last_session_at)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {fullDateTime(u.last_session_at) || "Never"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle">
                          <StatusPill status={u.status} />
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right align-middle">
                          <div className="flex items-center justify-end gap-2">
                            <PermissionGuard role={role} permission="rfid.edit" action="write">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEdit(u.id)}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                  aria-label="Edit RFID user"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <ConfirmDeleteDialog entityLabel="RFID user" onConfirm={() => handleDelete(u.id)}>
                                  <button
                                    type="button"
                                    className="p-1 rounded hover:bg-muted text-red-400 hover:text-red-600"
                                    aria-label="Delete RFID user"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </ConfirmDeleteDialog>
                              </div>
                            </PermissionGuard>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                  aria-label="More actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <div
                                  className="flex items-center justify-between gap-2 px-2 py-2"
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  <span className="text-sm text-foreground">Charging enabled</span>
                                  <Switch
                                    checked={u.enabled === 1}
                                    disabled={toggleBusyId === u.id || !canRwRfid}
                                    title={
                                      canRwRfid
                                        ? undefined
                                        : "Read-only access. Contact your administrator."
                                    }
                                    onCheckedChange={(checked) => {
                                      if (!canRwRfid) return;
                                      if (!checked) {
                                        setDisableDialogId(u.id);
                                        return;
                                      }
                                      void runToggleEnable(u.id, true);
                                    }}
                                  />
                                </div>
                                {u.status !== "blocked" && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    disabled={!canRwRfid}
                                    title={
                                      canRwRfid
                                        ? undefined
                                        : "Read-only access. Contact your administrator."
                                    }
                                    onSelect={() => {
                                      if (canRwRfid) setBlockDialogId(u.id);
                                    }}
                                  >
                                    Block user
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-4 border-t border-border">
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
                  {`${start + 1}-${end} of ${total}`}
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
          </div>
        )}
      </div>

      <AlertDialog open={disableDialogId != null} onOpenChange={(o) => !o && setDisableDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable charging?</AlertDialogTitle>
            <AlertDialogDescription>
              This RFID card will not be able to start sessions until re-enabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = disableDialogId;
                setDisableDialogId(null);
                if (id != null) void runToggleEnable(id, false);
              }}
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blockDialogId != null} onOpenChange={(o) => !o && setBlockDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block RFID user?</AlertDialogTitle>
            <AlertDialogDescription>
              The user will be marked as blocked and cannot use this card until unblocked in edit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (blockDialogId != null) void runBlockUser(blockDialogId);
              }}
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog modal={false} open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogPortal>
          <div
            role="presentation"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            aria-hidden
            onPointerDown={() => setDialogOpen(false)}
          />
        </DialogPortal>
        <DialogContent
          className="z-[51] max-w-2xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            const target = getOutsideEventTarget(e);
            if (isPortaledSelectMenuTarget(target)) e.preventDefault();
          }}
          onFocusOutside={(e) => {
            const orig = e.detail.originalEvent;
            const related = orig instanceof FocusEvent ? orig.relatedTarget : null;
            if (
              isPortaledSelectMenuTarget(getOutsideEventTarget(e)) ||
              isPortaledSelectMenuTarget(related)
            ) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const target = getOutsideEventTarget(e);
            if (isPortaledSelectMenuTarget(target)) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit RFID User" : "Add RFID User"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update RFID card details." : "Register a new RFID card for charging."}
            </DialogDescription>
          </DialogHeader>
          {loadingOne ? (
            <p className="py-4 text-muted-foreground">Loading...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    RFID UID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="font-mono uppercase"
                    value={form.rfid_uid}
                    onChange={(e) => {
                      setRfidUidError(null);
                      setForm((f) => ({ ...f, rfid_uid: e.target.value.toUpperCase() }));
                    }}
                    placeholder="E.g. 298EF26F"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">Hex characters only (A–F, 0–9)</p>
                  {rfidUidError && <p className="text-xs text-destructive">{rfidUidError}</p>}
                </div>
                <div className="space-y-2">
                  <Label>
                    Organization <span className="text-destructive">*</span>
                  </Label>
                  <AppSelect
                    options={orgOptions ?? []}
                    value={String(form.organization_id)}
                    onChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        organization_id: Number(v) || 0,
                        allowed_locations: [],
                      }))
                    }
                    placeholder="Select organization"
                    isDisabled={loadingOrg}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Charging access scope</Label>
                  <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex flex-col gap-3" role="radiogroup" aria-label="Charging access scope">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="radio"
                          name="rfid-access-scope"
                          className="mt-1 h-4 w-4 accent-primary shrink-0"
                          checked={form.access_scope === "organization"}
                          onChange={() => {
                            setLocationsSelectionError(null);
                            setForm((f) => ({
                              ...f,
                              access_scope: "organization",
                              allowed_locations: [],
                            }));
                          }}
                        />
                        <span className="text-sm font-normal">Whole organization</span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="radio"
                          name="rfid-access-scope"
                          className="mt-1 h-4 w-4 accent-primary shrink-0"
                          checked={form.access_scope === "locations"}
                          onChange={() => {
                            setLocationsSelectionError(null);
                            setForm((f) => ({ ...f, access_scope: "locations" }));
                          }}
                        />
                        <span className="text-sm font-normal">Specific locations</span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="radio"
                          name="rfid-access-scope"
                          className="mt-1 h-4 w-4 accent-primary shrink-0"
                          checked={form.access_scope === "none"}
                          onChange={() => {
                            setLocationsSelectionError(null);
                            setForm((f) => ({
                              ...f,
                              access_scope: "none",
                              allowed_locations: [],
                            }));
                          }}
                        />
                        <span className="text-sm font-normal">No access (suspend)</span>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Whole organization: charge at any charger of the org. Specific locations: limit charging to
                      selected locations. No access: card exists but cannot start a session.
                    </p>
                    {form.access_scope === "locations" ? (
                      <div className="space-y-2 pt-1">
                        {locationsLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading locations…
                          </div>
                        ) : orgLocations.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No locations for this organization.</p>
                        ) : (
                          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border bg-background p-2">
                            {orgLocations.map((loc) => {
                              const checked = form.allowed_locations.includes(loc.location_id);
                              return (
                                <label
                                  key={loc.location_id}
                                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) => {
                                      setLocationsSelectionError(null);
                                      const on = v === true;
                                      setForm((f) => ({
                                        ...f,
                                        allowed_locations: on
                                          ? f.allowed_locations.includes(loc.location_id)
                                            ? f.allowed_locations
                                            : [...f.allowed_locations, loc.location_id]
                                          : f.allowed_locations.filter((id) => id !== loc.location_id),
                                      }));
                                    }}
                                  />
                                  <span className="text-sm">
                                    {loc.name}{" "}
                                    <span className="font-mono text-xs text-muted-foreground">#{loc.location_id}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        {locationsSelectionError ? (
                          <p className="text-xs text-destructive">{locationsSelectionError}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                {editingId && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Status</Label>
                    <div className="flex flex-wrap gap-6" role="radiogroup" aria-label="Status">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rfid-user-status"
                          className="h-4 w-4 accent-primary shrink-0"
                          checked={form.status === "active"}
                          onChange={() => setForm((f) => ({ ...f, status: "active" }))}
                        />
                        <span className="text-sm font-normal">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rfid-user-status"
                          className="h-4 w-4 accent-primary shrink-0"
                          checked={form.status === "blocked"}
                          onChange={() => setForm((f) => ({ ...f, status: "blocked" }))}
                        />
                        <span className="text-sm font-normal">Blocked</span>
                      </label>
                    </div>
                  </div>
                )}
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
