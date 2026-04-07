import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  exportAccessLog,
  exportAuditLog,
  fetchAccessLog,
  fetchAuditLog,
  fetchOrganizationsListAuthenticated,
} from "@/services/api";
import {
  ScrollText,
  List,
  Activity,
  Loader2,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Funnel,
  Zap,
  PlusCircle,
  Pencil,
  LogIn,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const PAGE_SIZE = 25;

const cardSurface = "border border-border bg-card shadow-sm";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function formatRowTimestamp(value: unknown): string {
  if (value == null || value === "") return "—";
  const s = String(value).trim();
  if (!s) return "—";
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(normalized);
  if (!Number.isFinite(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function rowTimestamp(row: Record<string, unknown>): string {
  return formatRowTimestamp(
    row.timestamp ?? row.created_at ?? row.createdAt ?? row.date,
  );
}

function rowUser(row: Record<string, unknown>): string {
  const u =
    row.user ??
    row.user_name ??
    row.userName ??
    row.email ??
    row.user_email ??
    row.operator;
  if (u != null && String(u).trim()) return String(u);
  const fn = row.first_name ?? row.f_name ?? "";
  const ln = row.last_name ?? row.l_name ?? "";
  const name = `${fn} ${ln}`.trim();
  return name || "—";
}

function rowAction(row: Record<string, unknown>): string {
  const a = row.action ?? row.event_type ?? "";
  return String(a || "—").toLowerCase();
}

function formatActionLabel(actionLower: string): string {
  if (!actionLower || actionLower === "—") return "—";
  return actionLower.charAt(0).toUpperCase() + actionLower.slice(1);
}

function rowEntityType(row: Record<string, unknown>): string {
  return String(row.entity_type ?? row.entityType ?? "—");
}

function rowEntityId(row: Record<string, unknown>): string {
  const id = row.entity_id ?? row.entityId ?? row.id ?? "";
  return id === "" || id == null ? "—" : String(id);
}

function parseJsonObject(val: unknown): Record<string, unknown> | null {
  if (val == null) return null;
  if (typeof val === "object" && !Array.isArray(val))
    return val as Record<string, unknown>;
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return null;
    try {
      const p = JSON.parse(s) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p))
        return p as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function valuesDiffer(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function diffValueObjects(
  oldVal: unknown,
  newVal: unknown,
): { key: string; oldV: unknown; newV: unknown }[] {
  const oldObj = parseJsonObject(oldVal) ?? {};
  const newObj = parseJsonObject(newVal) ?? {};
  const keys = new Set([
    ...Object.keys(oldObj),
    ...Object.keys(newObj),
  ]);
  const out: { key: string; oldV: unknown; newV: unknown }[] = [];
  for (const key of keys) {
    const o = key in oldObj ? oldObj[key] : undefined;
    const n = key in newObj ? newObj[key] : undefined;
    if (valuesDiffer(o, n)) out.push({ key, oldV: o, newV: n });
  }
  return out;
}

function humanizeFieldName(key: string): string {
  const s = key.replace(/_/g, " ").trim();
  if (!s) return key;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatScalarForDisplay(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "—";
  if (typeof v === "object")
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  return String(v);
}

function getChangedFieldLabels(row: Record<string, unknown>): string[] {
  return diffValueObjects(row.old_value, row.new_value).map((d) =>
    humanizeFieldName(d.key),
  );
}

function detailsSummaryFromRow(row: Record<string, unknown>): string {
  const action = rowAction(row);
  const et = rowEntityType(row);

  if (action === "update") {
    const labels = getChangedFieldLabels(row);
    if (labels.length) return `Updated ${labels.join(", ")}`;
    const d = row.details;
    if (d != null && String(d).trim()) return String(d).trim();
    return "Updated record";
  }
  if (action === "create") return `Created ${et}`;
  if (action === "delete") return `Deleted ${et}`;
  if (action === "login") return "Logged in";
  if (action === "logout") return "Logged out";
  if (action === "notification") {
    const nv = parseJsonObject(row.new_value) ?? {};
    const pick =
      nv.message ??
      nv.text ??
      nv.body ??
      nv.title ??
      nv.notification_message ??
      nv.msg;
    if (pick != null && String(pick).trim()) return String(pick).trim().slice(0, 160);
    const ov = parseJsonObject(row.old_value) ?? {};
    const pick2 =
      ov.message ??
      ov.text ??
      ov.body ??
      ov.title ??
      ov.notification_message;
    if (pick2 != null && String(pick2).trim()) return String(pick2).trim().slice(0, 160);
    return "Notification";
  }

  const raw = row.details;
  if (raw != null && String(raw).trim()) return String(raw).trim();
  return "—";
}

function truncate(s: string, max = 100): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function rowTimeMs(row: Record<string, unknown>): number {
  const v = row.timestamp ?? row.created_at ?? row.createdAt ?? row.date;
  if (v == null) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const t = new Date(normalized).getTime();
  return Number.isFinite(t) ? t : 0;
}

function entityTypeToDomain(entityType: string): string {
  const t = entityType.toLowerCase();
  if (t === "org_logo" || t === "organization") return "Organization";
  if (t === "maintenance_ticket") return "Support";
  if (t === "user") return "Users";
  if (t === "auth" || t === "login" || t === "logout")
    return "Authentication";
  if (["tariff", "connector", "charger", "location"].includes(t))
    return "Infrastructure";
  return "Other";
}

/** Domain for Activity charts — falls back to action for access-style rows. */
function rowDomain(row: Record<string, unknown>): string {
  const et = rowEntityType(row);
  if (et && et !== "—") return entityTypeToDomain(et);
  const a = rowAction(row);
  if (a === "login" || a === "logout") return "Authentication";
  return "Other";
}

function formatRelativeTimeAgo(row: Record<string, unknown>): string {
  const ms = rowTimeMs(row);
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 0) return "Just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.floor(day / 365);
  return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

const ACTIVITY_PAGE_SIZE = 1000;
const ACTIVITY_MAX_PAGES = 80;

async function fetchAllAuditNoOrg(
  fromIso: string,
  toIso: string,
): Promise<Record<string, unknown>[]> {
  const acc: Record<string, unknown>[] = [];
  let offset = 0;
  for (let p = 0; p < ACTIVITY_MAX_PAGES; p++) {
    const { rows, total } = await fetchAuditLog({
      from: fromIso,
      to: toIso,
      limit: ACTIVITY_PAGE_SIZE,
      offset,
    });
    acc.push(...rows);
    if (rows.length < ACTIVITY_PAGE_SIZE || acc.length >= total) break;
    offset += ACTIVITY_PAGE_SIZE;
  }
  return acc;
}

async function fetchAllAccessNoOrg(
  fromIso: string,
  toIso: string,
): Promise<Record<string, unknown>[]> {
  const acc: Record<string, unknown>[] = [];
  let offset = 0;
  for (let p = 0; p < ACTIVITY_MAX_PAGES; p++) {
    const { rows, total } = await fetchAccessLog({
      from: fromIso,
      to: toIso,
      limit: ACTIVITY_PAGE_SIZE,
      offset,
    });
    acc.push(...rows);
    if (rows.length < ACTIVITY_PAGE_SIZE || acc.length >= total) break;
    offset += ACTIVITY_PAGE_SIZE;
  }
  return acc;
}

const DOMAIN_COLORS = [
  "hsl(var(--primary))",
  "hsl(199 89% 48%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 50%)",
  "hsl(0 72% 51%)",
];

const CHART_ACTION_COLORS: Record<string, string> = {
  create: "hsl(142 76% 36%)",
  update: "hsl(38 92% 45%)",
  delete: "hsl(0 72% 51%)",
  login: "hsl(280 65% 50%)",
  logout: "hsl(215 16% 47%)",
  notification: "hsl(25 95% 53%)",
};

function ActionBadge({ action }: { action: string }) {
  const a = action.toLowerCase();
  const label = formatActionLabel(a);
  const map: Record<string, { className: string }> = {
    create: {
      className:
        "rounded-full px-2.5 py-0.5 border-0 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-medium",
    },
    update: {
      className:
        "rounded-full px-2.5 py-0.5 border-0 bg-amber-400/25 text-amber-950 dark:text-amber-200 font-medium",
    },
    delete: {
      className:
        "rounded-full px-2.5 py-0.5 border-0 bg-red-500/15 text-red-800 dark:text-red-300 font-medium",
    },
    login: {
      className:
        "rounded-full px-2.5 py-0.5 border-0 bg-violet-500/15 text-violet-800 dark:text-violet-300 font-medium",
    },
    notification: {
      className:
        "rounded-full px-2.5 py-0.5 border-0 bg-orange-500/15 text-orange-900 dark:text-orange-300 font-medium",
    },
    logout: {
      className:
        "rounded-full px-2.5 py-0.5 border-0 bg-muted text-muted-foreground font-medium",
    },
  };
  const cfg = map[a] ?? {
    className:
      "rounded-full px-2.5 py-0.5 border-0 bg-secondary text-secondary-foreground font-medium",
  };
  return (
    <Badge variant="outline" className={cn("border-transparent", cfg.className)}>
      {label}
    </Badge>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function defaultDateRangeInputs(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

function MoreDetailsModal({
  open,
  onOpenChange,
  row,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: Record<string, unknown> | null;
}) {
  if (!row) return null;

  const when = rowTimestamp(row);
  const who = rowUser(row);
  const actionText = formatActionLabel(rowAction(row));
  const et = rowEntityType(row);
  const eid = rowEntityId(row);
  const where =
    eid !== "—" ? `${et} · ${eid}` : et;

  const changes = diffValueObjects(row.old_value, row.new_value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(cardSurface, "max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 gap-0")}>
        <DialogHeader className="pr-8 pb-4 text-left space-y-1">
          <DialogTitle className="text-xl font-semibold">More details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">When</div>
              <div className="text-sm font-medium text-foreground">{when}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Who</div>
              <div className="text-sm font-medium text-foreground">{who}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Action</div>
              <div className="text-sm font-medium text-foreground">{actionText}</div>
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-medium text-muted-foreground">Where</div>
              <div className="text-sm font-medium text-foreground break-all">
                {truncate(where, 120)}
              </div>
            </div>
          </div>

          {changes.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="text-sm font-semibold text-foreground">What changed</div>
              <ul className="divide-y divide-border">
                {changes.map(({ key, oldV, newV }) => (
                  <li key={key} className="py-3 text-sm leading-relaxed">
                    <span className="font-medium text-foreground">
                      {humanizeFieldName(key)}:{" "}
                    </span>
                    <span className="text-muted-foreground">Previous value </span>
                    <span className="line-through decoration-foreground/50 text-muted-foreground">
                      {formatScalarForDisplay(oldV)}
                    </span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="text-foreground font-medium">
                      {formatScalarForDisplay(newV)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-start pt-6 border-t border-border mt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const tabs = [
  { id: "audit", label: "Audit Log", icon: ScrollText },
  { id: "access", label: "Access Log", icon: List },
  { id: "activity", label: "Activity Feed", icon: Activity },
];

const TAB_SUBTITLES: Record<string, string> = {
  audit:
    "Track administrative changes: locations, users, permissions, tariffs, and more",
  access:
    "Authentication events: login, logout, failed login, password reset, session, MFA",
  activity: "Latest activity across admin changes and access events",
};

function FiltersCard({
  onClear,
  onApply,
  children,
}: {
  onClear: () => void;
  onApply: () => void;
  children: ReactNode;
}) {
  return (
    <Card className={cn(cardSurface, "rounded-lg")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-5 px-6">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Funnel className="h-4 w-4 text-muted-foreground shrink-0" />
          Filters
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground h-auto px-2 py-1"
          onClick={onClear}
        >
          Clear
        </Button>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">{children}</div>
        <div>
          <Button type="button" className="font-medium" onClick={onApply}>
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LogTableCard({
  title,
  rows,
  total,
  loading,
  page,
  onPageChange,
  exportCsv,
  exportPdf,
  onRowClick,
}: {
  title: string;
  rows: Record<string, unknown>[];
  total: number;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  exportCsv: () => void;
  exportPdf: () => void;
  onRowClick: (row: Record<string, unknown>) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fromIdx = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const toIdx = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <Card className={cn(cardSurface, "rounded-lg")}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-4 pt-5 px-6">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportPdf}>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No log entries"
            description="Try adjusting filters or the date range."
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left p-3 font-medium text-foreground">Timestamp</th>
                    <th className="text-left p-3 font-medium text-foreground">User</th>
                    <th className="text-left p-3 font-medium text-foreground">Action</th>
                    <th className="text-left p-3 font-medium text-foreground">Entity Type</th>
                    <th className="text-left p-3 font-medium text-foreground">Entity ID</th>
                    <th className="text-left p-3 font-medium text-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={String(row.id ?? row.log_id ?? i)}
                      className="border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => onRowClick(row)}
                    >
                      <td className="p-3 whitespace-nowrap tabular-nums text-foreground">
                        {rowTimestamp(row)}
                      </td>
                      <td className="p-3 text-foreground">{rowUser(row)}</td>
                      <td className="p-3">
                        <ActionBadge action={rowAction(row)} />
                      </td>
                      <td className="p-3 text-foreground">{rowEntityType(row)}</td>
                      <td className="p-3 text-foreground">{rowEntityId(row)}</td>
                      <td className="p-3 text-muted-foreground max-w-[260px]">
                        {truncate(detailsSummaryFromRow(row))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {total === 0
                  ? "No results"
                  : `Showing ${fromIdx}–${toIdx} of ${total}`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 0 || loading}
                  onClick={() => onPageChange(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="tabular-nums px-1">
                  Page {page + 1} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={(page + 1) * PAGE_SIZE >= total || loading}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditTab({
  orgs,
  orgsLoading,
}: {
  orgs: { id: number; name: string }[];
  orgsLoading: boolean;
}) {
  const { toast } = useToast();
  const initial = useMemo(() => defaultDateRangeInputs(), []);

  const [draftFrom, setDraftFrom] = useState(initial.from);
  const [draftTo, setDraftTo] = useState(initial.to);
  const [draftAction, setDraftAction] = useState("");
  const [draftEntityType, setDraftEntityType] = useState("");
  const [draftOrgId, setDraftOrgId] = useState("");

  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);
  const [appliedAction, setAppliedAction] = useState("");
  const [appliedEntityType, setAppliedEntityType] = useState("");
  const [appliedOrgId, setAppliedOrgId] = useState("");

  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows: r, total: t } = await fetchAuditLog({
        from: appliedFrom ? `${appliedFrom}T00:00:00.000Z` : undefined,
        to: appliedTo ? `${appliedTo}T23:59:59.999Z` : undefined,
        action: appliedAction || undefined,
        entity_type: appliedEntityType || undefined,
        organization_id: appliedOrgId || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(r);
      setTotal(t);
    } catch (e) {
      toast({
        title: "Audit log failed",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      });
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    appliedFrom,
    appliedTo,
    appliedAction,
    appliedEntityType,
    appliedOrgId,
    page,
    toast,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClear = () => {
    const d = defaultDateRangeInputs();
    setDraftFrom(d.from);
    setDraftTo(d.to);
    setDraftAction("");
    setDraftEntityType("");
    setDraftOrgId("");
    setAppliedFrom(d.from);
    setAppliedTo(d.to);
    setAppliedAction("");
    setAppliedEntityType("");
    setAppliedOrgId("");
    setPage(0);
  };

  const handleApply = () => {
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
    setAppliedAction(draftAction);
    setAppliedEntityType(draftEntityType);
    setAppliedOrgId(draftOrgId);
    setPage(0);
  };

  const exportQuery = useMemo(
    () => ({
      from: appliedFrom ? `${appliedFrom}T00:00:00.000Z` : undefined,
      to: appliedTo ? `${appliedTo}T23:59:59.999Z` : undefined,
      action: appliedAction || undefined,
      entity_type: appliedEntityType || undefined,
      organization_id: appliedOrgId || undefined,
    }),
    [appliedFrom, appliedTo, appliedAction, appliedEntityType, appliedOrgId],
  );

  const runExport = async (format: "csv" | "pdf") => {
    try {
      const blob = await exportAuditLog(format, exportQuery);
      const ext = format === "csv" ? "csv" : "pdf";
      downloadBlob(blob, `audit-log-${appliedFrom}-${appliedTo}.${ext}`);
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-5">
      <FiltersCard onClear={handleClear} onApply={handleApply}>
        <div className="space-y-1.5 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground">From date</label>
          <Input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground">To date</label>
          <Input
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 min-w-[160px]">
          <label className="text-xs font-medium text-muted-foreground">Action</label>
          <select
            className={selectClass}
            value={draftAction}
            onChange={(e) => setDraftAction(e.target.value)}
          >
            <option value="">All</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="notification">Notification</option>
          </select>
        </div>
        <div className="space-y-1.5 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground">Entity Type</label>
          <select
            className={selectClass}
            value={draftEntityType}
            onChange={(e) => setDraftEntityType(e.target.value)}
          >
            <option value="">All</option>
            <option value="org_logo">org_logo</option>
            <option value="maintenance_ticket">maintenance_ticket</option>
            <option value="user">user</option>
            <option value="tariff">tariff</option>
            <option value="charger">charger</option>
            <option value="connector">connector</option>
            <option value="location">location</option>
          </select>
        </div>
        <div className="space-y-1.5 min-w-[220px] flex-1">
          <label className="text-xs font-medium text-muted-foreground">Organization</label>
          <select
            className={selectClass}
            disabled={orgsLoading}
            value={draftOrgId}
            onChange={(e) => setDraftOrgId(e.target.value)}
          >
            <option value="">All organizations</option>
            {orgs.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </FiltersCard>

      <LogTableCard
        title="Audit Log"
        rows={rows}
        total={total}
        loading={loading}
        page={page}
        onPageChange={setPage}
        exportCsv={() => runExport("csv")}
        exportPdf={() => runExport("pdf")}
        onRowClick={setDetail}
      />

      <MoreDetailsModal
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        row={detail}
      />
    </div>
  );
}

function AccessTab({
  orgs,
  orgsLoading,
}: {
  orgs: { id: number; name: string }[];
  orgsLoading: boolean;
}) {
  const { toast } = useToast();
  const initial = useMemo(() => defaultDateRangeInputs(), []);

  const [draftFrom, setDraftFrom] = useState(initial.from);
  const [draftTo, setDraftTo] = useState(initial.to);
  const [draftAction, setDraftAction] = useState("");
  const [draftOrgId, setDraftOrgId] = useState("");

  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);
  const [appliedAction, setAppliedAction] = useState("");
  const [appliedOrgId, setAppliedOrgId] = useState("");

  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows: r, total: t } = await fetchAccessLog({
        from: appliedFrom ? `${appliedFrom}T00:00:00.000Z` : undefined,
        to: appliedTo ? `${appliedTo}T23:59:59.999Z` : undefined,
        action: appliedAction || undefined,
        organization_id: appliedOrgId || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(r);
      setTotal(t);
    } catch (e) {
      toast({
        title: "Access log failed",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      });
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo, appliedAction, appliedOrgId, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClear = () => {
    const d = defaultDateRangeInputs();
    setDraftFrom(d.from);
    setDraftTo(d.to);
    setDraftAction("");
    setDraftOrgId("");
    setAppliedFrom(d.from);
    setAppliedTo(d.to);
    setAppliedAction("");
    setAppliedOrgId("");
    setPage(0);
  };

  const handleApply = () => {
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
    setAppliedAction(draftAction);
    setAppliedOrgId(draftOrgId);
    setPage(0);
  };

  const exportQuery = useMemo(
    () => ({
      from: appliedFrom ? `${appliedFrom}T00:00:00.000Z` : undefined,
      to: appliedTo ? `${appliedTo}T23:59:59.999Z` : undefined,
      action: appliedAction || undefined,
      organization_id: appliedOrgId || undefined,
    }),
    [appliedFrom, appliedTo, appliedAction, appliedOrgId],
  );

  const runExport = async (format: "csv" | "pdf") => {
    try {
      const blob = await exportAccessLog(format, exportQuery);
      const ext = format === "csv" ? "csv" : "pdf";
      downloadBlob(blob, `access-log-${appliedFrom}-${appliedTo}.${ext}`);
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-5">
      <FiltersCard onClear={handleClear} onApply={handleApply}>
        <div className="space-y-1.5 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground">From date</label>
          <Input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground">To date</label>
          <Input
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 min-w-[160px]">
          <label className="text-xs font-medium text-muted-foreground">Action</label>
          <select
            className={selectClass}
            value={draftAction}
            onChange={(e) => setDraftAction(e.target.value)}
          >
            <option value="">All</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>
        </div>
        <div className="space-y-1.5 min-w-[220px] flex-1">
          <label className="text-xs font-medium text-muted-foreground">Organization</label>
          <select
            className={selectClass}
            disabled={orgsLoading}
            value={draftOrgId}
            onChange={(e) => setDraftOrgId(e.target.value)}
          >
            <option value="">All organizations</option>
            {orgs.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </FiltersCard>

      <LogTableCard
        title="Access Log"
        rows={rows}
        total={total}
        loading={loading}
        page={page}
        onPageChange={setPage}
        exportCsv={() => runExport("csv")}
        exportPdf={() => runExport("pdf")}
        onRowClick={setDetail}
      />

      <MoreDetailsModal
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        row={detail}
      />
    </div>
  );
}

type ActivityPreset = "24h" | "7d" | "30d" | "60d";

function activityIsoRange(preset: ActivityPreset): {
  fromIso: string;
  toIso: string;
} {
  const to = new Date();
  const from = new Date(to);
  if (preset === "24h") from.setTime(from.getTime() - 24 * 60 * 60 * 1000);
  else if (preset === "7d") from.setDate(from.getDate() - 7);
  else if (preset === "30d") from.setDate(from.getDate() - 30);
  else from.setDate(from.getDate() - 60);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

const PRESET_LABEL: Record<ActivityPreset, string> = {
  "24h": "Last 24 hours",
  "7d": "Last week",
  "30d": "Last month",
  "60d": "Last 2 months",
};

function FilteredActivityListModal({
  open,
  onOpenChange,
  title,
  rows,
  onRowClick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  rows: Record<string, unknown>[];
  onRowClick: (row: Record<string, unknown>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader className="text-left">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 rounded-lg border border-border">
          {rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No matching events.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 sticky top-0">
                  <th className="text-left p-3 font-medium">Timestamp</th>
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Action</th>
                  <th className="text-left p-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={`${String(row.id ?? row.log_id ?? i)}-${i}`}
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50"
                    onClick={() => onRowClick(row)}
                  >
                    <td className="p-3 whitespace-nowrap tabular-nums">
                      {rowTimestamp(row)}
                    </td>
                    <td className="p-3">{rowUser(row)}</td>
                    <td className="p-3">
                      <ActionBadge action={rowAction(row)} />
                    </td>
                    <td className="p-3 text-muted-foreground max-w-[220px]">
                      {truncate(detailsSummaryFromRow(row))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const kpiCardClass =
  "rounded-lg border border-border bg-white dark:bg-card shadow-sm";

function ActivityFeedTab() {
  const { toast } = useToast();
  const [preset, setPreset] = useState<ActivityPreset>("24h");
  const { fromIso, toIso } = useMemo(() => activityIsoRange(preset), [preset]);

  const [mergedRows, setMergedRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(
    null,
  );
  const [listFilter, setListFilter] = useState<
    | { kind: "domain"; value: string }
    | { kind: "action"; value: string }
    | null
  >(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [auditRows, accessRows] = await Promise.all([
        fetchAllAuditNoOrg(fromIso, toIso),
        fetchAllAccessNoOrg(fromIso, toIso),
      ]);
      const merged = [...auditRows, ...accessRows].sort(
        (a, b) => rowTimeMs(b) - rowTimeMs(a),
      );
      setMergedRows(merged);
    } catch (e) {
      toast({
        title: "Activity feed failed",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      });
      setMergedRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromIso, toIso, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshRef.current();
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  const kpi = useMemo(() => {
    let creates = 0;
    let updates = 0;
    let logins = 0;
    for (const r of mergedRows) {
      const a = rowAction(r);
      if (a === "create") creates++;
      else if (a === "update") updates++;
      else if (a === "login") logins++;
    }
    return {
      total: mergedRows.length,
      creates,
      updates,
      logins,
    };
  }, [mergedRows]);

  const latestRow = mergedRows[0] ?? null;

  const domainData = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of mergedRows) {
      const domain = rowDomain(row);
      map.set(domain, (map.get(domain) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [mergedRows]);

  const actionData = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of mergedRows) {
      const a = rowAction(row);
      if (!a || a === "—") continue;
      map.set(a, (map.get(a) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [mergedRows]);

  const domainTotal = useMemo(
    () => domainData.reduce((s, d) => s + d.value, 0),
    [domainData],
  );
  const actionTotal = useMemo(
    () => actionData.reduce((s, d) => s + d.count, 0),
    [actionData],
  );

  const filteredListRows = useMemo(() => {
    if (!listFilter) return [];
    if (listFilter.kind === "domain") {
      return mergedRows.filter((r) => rowDomain(r) === listFilter.value);
    }
    return mergedRows.filter(
      (r) => rowAction(r) === listFilter.value.toLowerCase(),
    );
  }, [listFilter, mergedRows]);

  const rangeHint = PRESET_LABEL[preset];

  const handlePieClick = (data: unknown) => {
    const d = data as { name?: string; payload?: { name?: string } };
    const name = d?.name ?? d?.payload?.name;
    if (name) setListFilter({ kind: "domain", value: name });
  };

  const handleBarClick = (data: unknown) => {
    const entry = data as { name?: string; payload?: { name?: string } };
    const name = entry?.name ?? entry?.payload?.name;
    if (name) setListFilter({ kind: "action", value: String(name) });
  };

  return (
    <div className="space-y-6">
      {latestRow && (
        <Card
          className={cn(
            "rounded-lg border border-primary/20 bg-primary/5 shadow-sm pl-1 border-l-4 border-l-primary",
          )}
        >
          <CardContent className="py-4 px-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4 min-w-0 flex-1">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Zap className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    Latest update:{" "}
                    <span className="font-normal text-foreground/90">
                      {detailsSummaryFromRow(latestRow)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatActionLabel(rowAction(latestRow))} • {rowUser(latestRow)}{" "}
                    • {formatRelativeTimeAgo(latestRow)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="text-primary shrink-0 font-medium self-start sm:self-center"
                onClick={() => setDetailRow(latestRow)}
              >
                View details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Activity Feed</h2>
        <div className="flex flex-wrap gap-2">
          {(["24h", "7d", "30d", "60d"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                preset === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-white dark:bg-card text-muted-foreground hover:bg-muted/50",
              )}
            >
              {PRESET_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Summary</h2>
        <p className="text-sm text-muted-foreground">
          Selected range: {PRESET_LABEL[preset]}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            {
              label: "Total activities",
              value: kpi.total,
              icon: Activity,
              sub: rangeHint,
            },
            {
              label: "Creates",
              value: kpi.creates,
              icon: PlusCircle,
              sub: rangeHint,
            },
            {
              label: "Updates",
              value: kpi.updates,
              icon: Pencil,
              sub: rangeHint,
            },
            {
              label: "Logins",
              value: kpi.logins,
              icon: LogIn,
              sub: rangeHint,
            },
          ] as const
        ).map((k) => (
          <Card key={k.label} className={kpiCardClass}>
            <CardContent className="pt-4 pb-4 px-5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-muted-foreground">{k.label}</span>
                <k.icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              </div>
              <div className="text-3xl font-bold tabular-nums text-foreground mt-2">
                {loading ? "—" : k.value.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-2">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Insights</h2>

        {loading && mergedRows.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className={cn(cardSurface, "rounded-lg bg-white dark:bg-card")}>
              <CardHeader className="px-6 pt-5 pb-2 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold">By domain</CardTitle>
                    <p className="text-sm text-muted-foreground font-normal mt-1">
                      Distribution by domain
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {domainTotal}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="h-[280px] px-6 pb-4 flex flex-col">
                {domainData.length === 0 ? (
                  <EmptyState title="No chart data" />
                ) : (
                  <>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={domainData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={88}
                            paddingAngle={2}
                            className="cursor-pointer outline-none"
                            onClick={handlePieClick}
                          >
                            {domainData.map((_, i) => (
                              <Cell
                                key={i}
                                fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]}
                                className="cursor-pointer"
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-2 shrink-0">
                      Click a segment to view all results
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className={cn(cardSurface, "rounded-lg bg-white dark:bg-card")}>
              <CardHeader className="px-6 pt-5 pb-2 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold">By action</CardTitle>
                    <p className="text-sm text-muted-foreground font-normal mt-1">
                      Distribution by action
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {actionTotal}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="h-[280px] px-6 pb-4 flex flex-col">
                {actionData.length === 0 ? (
                  <EmptyState title="No chart data" />
                ) : (
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={actionData}
                        margin={{ left: 8, right: 16 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={88}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          radius={[0, 4, 4, 0]}
                          className="cursor-pointer"
                          onClick={handleBarClick}
                        >
                          {actionData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={
                                CHART_ACTION_COLORS[entry.name.toLowerCase()] ??
                                DOMAIN_COLORS[i % DOMAIN_COLORS.length]
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {actionData.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center pt-2 shrink-0">
                    Click a segment to view all results
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <FilteredActivityListModal
        open={listFilter !== null}
        onOpenChange={(o) => !o && setListFilter(null)}
        title={
          listFilter
            ? listFilter.kind === "domain"
              ? `Domain: ${listFilter.value}`
              : `Action: ${formatActionLabel(listFilter.value)}`
            : ""
        }
        rows={filteredListRows}
        onRowClick={(row) => {
          setListFilter(null);
          setDetailRow(row);
        }}
      />

      <MoreDetailsModal
        open={detailRow !== null}
        onOpenChange={(o) => !o && setDetailRow(null)}
        row={detailRow}
      />
    </div>
  );
}

const AuditLogChrome = memo(function AuditLogChrome({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <header className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Audit Log</h1>
      <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
        {TAB_SUBTITLES[activeTab] ?? TAB_SUBTITLES.audit}
      </p>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
    </header>
  );
});

const AuditLog = () => {
  const [activeTab, setActiveTab] = useState("audit");
  const [orgs, setOrgs] = useState<{ id: number; name: string }[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchOrganizationsListAuthenticated();
        if (!cancelled) setOrgs(list);
      } catch (e) {
        if (!cancelled) {
          toast({
            title: "Organizations",
            description:
              e instanceof Error ? e.message : "Could not load organization list",
            variant: "destructive",
          });
          setOrgs([]);
        }
      } finally {
        if (!cancelled) setOrgsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AuditLogChrome activeTab={activeTab} onTabChange={setActiveTab} />

        <div>
          <PermissionGuard
            permission="finance.reports"
            action="read"
            fallback={
              <Card className={cn(cardSurface, "rounded-lg")}>
                <CardContent className="py-8">
                  <EmptyState
                    title="Access denied"
                    description="You don't have permission to view the audit log."
                  />
                </CardContent>
              </Card>
            }
          >
            <div className={cn(activeTab !== "audit" && "hidden")} aria-hidden={activeTab !== "audit"}>
              <AuditTab orgs={orgs} orgsLoading={orgsLoading} />
            </div>
            <div className={cn(activeTab !== "access" && "hidden")} aria-hidden={activeTab !== "access"}>
              <AccessTab orgs={orgs} orgsLoading={orgsLoading} />
            </div>
            <div className={cn(activeTab !== "activity" && "hidden")} aria-hidden={activeTab !== "activity"}>
              <ActivityFeedTab />
            </div>
          </PermissionGuard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditLog;
