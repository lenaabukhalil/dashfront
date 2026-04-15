import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  fetchAccessLogSummary,
  fetchAuditLog,
  fetchChargerNotifications,
  fetchOrganizationsListAuthenticated,
  type AccessLogSummaryRow,
  type ChargerNotificationItem,
} from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ScrollText,
  List,
  Loader2,
  FileDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Funnel,
  Zap,
} from "lucide-react";

const PAGE_SIZE = 10;
const CHARGERS_LOG_PAGE_SIZE = 15;

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
  const rawUserId = row.user_id ?? row.userId;
  const hasUserId =
    rawUserId !== null &&
    rawUserId !== undefined &&
    String(rawUserId).trim() !== "";
  if (!hasUserId) return "System";

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
  { id: "chargers", label: "Chargers Log", icon: Zap },
  { id: "access", label: "Access Log", icon: List },
];

const TAB_SUBTITLES: Record<string, string> = {
  audit:
    "Track administrative changes: locations, users, permissions, tariffs, and more",
  chargers:
    "Charger and connector audit trail: create, update, and delete events",
  access:
    "Authentication events: login, logout, failed login, password reset, session, MFA",
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
            <div className="mt-2 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Items per page</span>
                <span className="inline-flex h-8 min-w-[88px] items-center justify-center rounded-md border border-input bg-background px-3 tabular-nums">
                  {PAGE_SIZE}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums">
                  {total === 0 ? "0-0 of 0" : `${fromIdx}-${toIdx} of ${total}`}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page <= 0 || loading}
                    onClick={() => onPageChange(0)}
                    aria-label="First page"
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page <= 0 || loading}
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    aria-label="Previous page"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={(page + 1) * PAGE_SIZE >= total || loading}
                    onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                    aria-label="Next page"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={(page + 1) * PAGE_SIZE >= total || loading}
                    onClick={() => onPageChange(Math.max(0, totalPages - 1))}
                    aria-label="Last page"
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccessSummaryTableCard({
  rows,
  total,
  loading,
  page,
  onPageChange,
  exportCsv,
  exportPdf,
}: {
  rows: AccessLogSummaryRow[];
  total: number;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  exportCsv: () => void;
  exportPdf: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fromIdx = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const toIdx = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <Card className={cn(cardSurface, "rounded-lg")}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-4 pt-5 px-6">
        <CardTitle className="text-base font-semibold">Access Log</CardTitle>
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
            title="No access summary entries"
            description="Try adjusting filters or the date range."
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left p-3 font-medium text-foreground">User</th>
                    <th className="text-left p-3 font-medium text-foreground">Login Count</th>
                    <th className="text-left p-3 font-medium text-foreground">First Login</th>
                    <th className="text-left p-3 font-medium text-foreground">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    (() => {
                      const userId = String(row.user_id ?? "");
                      const userName = String(row.user_name ?? "").trim();
                      const organizationName = String(row.organization_name ?? "").trim();
                      const countClass =
                        row.login_count >= 50
                          ? "bg-red-500/15 text-red-800 dark:text-red-300"
                          : row.login_count >= 10
                            ? "bg-primary/15 text-primary"
                            : row.login_count >= 3
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-muted text-muted-foreground";
                      return (
                        <tr
                          key={`${userId || row.user_name || "unknown"}-${i}`}
                          className="border-b border-border transition-colors hover:bg-muted/50"
                        >
                          <td className="p-3 text-foreground">
                            <div className="min-w-0">
                              {userName ? (
                                <div className="text-foreground">{userName}</div>
                              ) : (
                                <span className="italic text-muted-foreground">Unknown User</span>
                              )}
                              {organizationName ? (
                                <div className="text-xs text-muted-foreground">{organizationName}</div>
                              ) : null}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary" className={cn("tabular-nums", countClass)}>
                              {row.login_count}
                            </Badge>
                          </td>
                          <td className="p-3 whitespace-nowrap tabular-nums text-foreground">
                            <div>{formatRowTimestamp(row.first_login)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatRelativeTimeAgo({ timestamp: row.first_login })}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap tabular-nums text-foreground">
                            <div>{formatRowTimestamp(row.last_login)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatRelativeTimeAgo({ timestamp: row.last_login })}
                            </div>
                          </td>
                        </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Items per page</span>
                <span className="inline-flex h-8 min-w-[88px] items-center justify-center rounded-md border border-input bg-background px-3 tabular-nums">
                  {PAGE_SIZE}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums">
                  {total === 0 ? "0-0 of 0" : `${fromIdx}-${toIdx} of ${total}`}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page <= 0 || loading}
                    onClick={() => onPageChange(0)}
                    aria-label="First page"
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page <= 0 || loading}
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    aria-label="Previous page"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={(page + 1) * PAGE_SIZE >= total || loading}
                    onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                    aria-label="Next page"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={(page + 1) * PAGE_SIZE >= total || loading}
                    onClick={() => onPageChange(Math.max(0, totalPages - 1))}
                    aria-label="Last page"
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
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

function notificationTimeMs(n: ChargerNotificationItem): number {
  if (n.timestamp != null) {
    const t = Number(n.timestamp);
    if (Number.isFinite(t)) return t;
  }
  if (n.createdAt != null && String(n.createdAt).trim() !== "") {
    const s = String(n.createdAt).trim();
    const normalized = s.includes("T") ? s : s.replace(" ", "T");
    const d = new Date(normalized);
    const t = d.getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

function notificationOrgMatches(
  n: ChargerNotificationItem,
  appliedOrgId: string,
): boolean {
  if (!appliedOrgId) return true;
  const r = n as Record<string, unknown>;
  const oid = r.organization_id ?? r.organizationId ?? r.org_id;
  if (oid == null || String(oid).trim() === "") return false;
  return String(oid) === appliedOrgId;
}

const CHARGERS_LOG_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "";

type ChargersLogLookupMaps = {
  locationMap: Map<string, { name: string; orgId: string }>;
  orgNameMap: Map<string, string>;
};

const emptyChargersLogLookup = (): ChargersLogLookupMaps => ({
  locationMap: new Map(),
  orgNameMap: new Map(),
});

function ChargersLogTab({
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
  const [draftOrgId, setDraftOrgId] = useState("");

  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);
  const [appliedOrgId, setAppliedOrgId] = useState("");

  const [allNotifs, setAllNotifs] = useState<ChargerNotificationItem[]>([]);
  const [allChargers, setAllChargers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [tablePage, setTablePage] = useState(0);
  const [lookupMaps, setLookupMaps] = useState<ChargersLogLookupMaps>(() =>
    emptyChargersLogLookup(),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rawNotifs, rawChargers, rawLocations, rawOrgs] = await Promise.all([
        fetchChargerNotifications({ since: 0 }).catch(
          () => [] as ChargerNotificationItem[],
        ),
        fetch(`${CHARGERS_LOG_API_BASE}/v4/charger`)
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .then((d) => (Array.isArray(d) ? d : (d?.data ?? [])))
          .catch(() => []),
        fetch(`${CHARGERS_LOG_API_BASE}/v4/location`)
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .then((d) => (Array.isArray(d) ? d : (d?.data ?? [])))
          .catch(() => []),
        fetch(`${CHARGERS_LOG_API_BASE}/v4/org`)
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .then((d) => (Array.isArray(d) ? d : (d?.data ?? [])))
          .catch(() => []),
      ]);

      const locRows = Array.isArray(rawLocations)
        ? (rawLocations as Record<string, unknown>[])
        : [];
      const chargerRows = Array.isArray(rawChargers)
        ? (rawChargers as Record<string, unknown>[])
        : [];

      setAllChargers(chargerRows);

      const locationMap = new Map<string, { name: string; orgId: string }>();
      for (const loc of locRows) {
        const id = String(loc.id ?? loc.location_id ?? "").trim();
        if (id) {
          locationMap.set(id, {
            name: String(loc.name ?? loc.location_name ?? id).trim(),
            orgId: String(loc.organization_id ?? loc.org_id ?? "").trim(),
          });
        }
      }

      const orgNameMap = new Map<string, string>();
      const orgRows = Array.isArray(rawOrgs)
        ? (rawOrgs as Record<string, unknown>[])
        : [];
      for (const org of orgRows) {
        const id = String(org.id ?? org.organization_id ?? "").trim();
        const name = String(org.name ?? "").trim();
        if (id && name) orgNameMap.set(id, name);
      }
      for (const loc of locRows) {
        const orgId = String(loc.organization_id ?? loc.org_id ?? "").trim();
        const orgName = String(
          loc.org_name ?? loc.organization_name ?? "",
        ).trim();
        if (orgId && orgName && !orgNameMap.has(orgId)) {
          orgNameMap.set(orgId, orgName);
        }
      }

      const notifs = Array.isArray(rawNotifs) ? rawNotifs : [];
      const filtered = notifs.filter((n) => {
        const ms = notificationTimeMs(n);
        if (!ms) return false;
        const d = new Date(ms);
        if (appliedFrom) {
          const from = new Date(`${appliedFrom}T00:00:00`);
          if (d < from) return false;
        }
        if (appliedTo) {
          const to = new Date(`${appliedTo}T23:59:59`);
          if (d > to) return false;
        }
        return notificationOrgMatches(n, appliedOrgId);
      });

      setAllNotifs(filtered);
      setLookupMaps({ locationMap, orgNameMap });
    } catch (e) {
      toast({
        title: "Failed to load",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
      setAllNotifs([]);
      setAllChargers([]);
      setLookupMaps(emptyChargersLogLookup());
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo, appliedOrgId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const chargerStats = useMemo(() => {
    type Row = {
      chargerId: string;
      onlineCount: number;
      offlineCount: number;
      totalEvents: number;
      firstEvent: string;
      lastEvent: string;
      lastStatus: boolean;
      locationName: string;
      orgName: string;
    };

    const { locationMap, orgNameMap } = lookupMaps;

    const notifsByCharger = new Map<string, ChargerNotificationItem[]>();
    for (const n of allNotifs) {
      const id = String(n.chargerId ?? "").trim();
      if (!id) continue;
      const list = notifsByCharger.get(id) ?? [];
      list.push(n);
      notifsByCharger.set(id, list);
    }

    const rows: Row[] = allChargers.map((c) => {
      const chargerIdKey = String(
        c.chargerID ?? c.charger_id ?? c.id ?? c.name ?? "",
      ).trim();
      const chargerDisplayId =
        chargerIdKey ||
        String(c.id ?? "").trim() ||
        String(c.name ?? "").trim() ||
        "—";

      const notifs = notifsByCharger.get(chargerIdKey) ?? [];

      const onlineCount = notifs.filter((n) => n.online === true).length;
      const offlineCount = notifs.filter((n) => n.online === false).length;
      const totalEvents = onlineCount + offlineCount;

      const timestamps = notifs
        .map((n) => notificationTimeMs(n))
        .filter((ms): ms is number => ms > 0)
        .sort((a, b) => a - b);

      const firstEvent = timestamps[0]
        ? formatRowTimestamp(new Date(timestamps[0]).toISOString())
        : "—";
      const lastEvent = timestamps[timestamps.length - 1]
        ? formatRowTimestamp(
            new Date(timestamps[timestamps.length - 1]).toISOString(),
          )
        : "—";

      const latestMs = timestamps[timestamps.length - 1] ?? 0;
      const latestNotif = latestMs
        ? notifs.find((n) => (notificationTimeMs(n) ?? 0) === latestMs)
        : undefined;
      const lastStatus = latestNotif?.online ?? false;

      const locationId = String(c.location_id ?? c.locationId ?? "").trim();
      const locationInfo = locationId ? locationMap.get(locationId) : undefined;
      const locationName = locationInfo?.name ?? "—";
      const orgId = locationInfo?.orgId ?? "";
      const orgName = orgId ? (orgNameMap.get(orgId) ?? orgId) : "—";

      return {
        chargerId: chargerDisplayId,
        onlineCount,
        offlineCount,
        totalEvents,
        firstEvent,
        lastEvent,
        lastStatus,
        locationName,
        orgName,
      };
    });

    return rows.sort((a, b) => {
      if (b.totalEvents !== a.totalEvents) return b.totalEvents - a.totalEvents;
      return a.chargerId.localeCompare(b.chargerId);
    });
  }, [allNotifs, allChargers, lookupMaps]);

  const totalChargers = chargerStats.length;
  const tableTotalPages = Math.max(
    1,
    Math.ceil(totalChargers / CHARGERS_LOG_PAGE_SIZE),
  );
  const pagedChargerRows = useMemo(() => {
    const start = tablePage * CHARGERS_LOG_PAGE_SIZE;
    return chargerStats.slice(start, start + CHARGERS_LOG_PAGE_SIZE);
  }, [chargerStats, tablePage]);

  const tableFromIdx =
    totalChargers === 0 ? 0 : tablePage * CHARGERS_LOG_PAGE_SIZE + 1;
  const tableToIdx = Math.min(
    totalChargers,
    (tablePage + 1) * CHARGERS_LOG_PAGE_SIZE,
  );

  const handleClear = () => {
    const i = defaultDateRangeInputs();
    setDraftFrom(i.from);
    setDraftTo(i.to);
    setDraftOrgId("");
    setAppliedFrom(i.from);
    setAppliedTo(i.to);
    setAppliedOrgId("");
    setTablePage(0);
  };

  const handleApply = () => {
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
    setAppliedOrgId(draftOrgId);
    setTablePage(0);
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

      <Card className={cn(cardSurface, "rounded-lg")}>
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-base font-semibold">
            Charger Status History
          </CardTitle>
          <CardDescription>
            Online and offline events per charger in the selected period
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {loading ? (
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="p-3">
                          <Skeleton className="h-4 w-full max-w-[100px]" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : totalChargers === 0 ? (
            <EmptyState
              title="No activity found"
              description="No online/offline events in the selected period."
            />
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left p-3 font-medium">Charger ID</th>
                      <th className="text-left p-3 font-medium">Organization</th>
                      <th className="text-left p-3 font-medium">Location</th>
                      <th className="text-left p-3 font-medium">Last Status</th>
                      <th className="text-left p-3 font-medium">Online Times</th>
                      <th className="text-left p-3 font-medium">Offline Times</th>
                      <th className="text-left p-3 font-medium">Total Events</th>
                      <th className="text-left p-3 font-medium whitespace-nowrap">
                        First Event
                      </th>
                      <th className="text-left p-3 font-medium whitespace-nowrap">
                        Last Event
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedChargerRows.map((row) => (
                      <tr
                        key={row.chargerId}
                        className="border-b border-border last:border-0"
                      >
                        <td className="p-3 font-medium tabular-nums">
                          {row.chargerId}
                        </td>
                        <td
                          className={cn(
                            "p-3",
                            row.orgName === "—" && "text-muted-foreground",
                          )}
                        >
                          {row.orgName}
                        </td>
                        <td
                          className={cn(
                            "p-3",
                            row.locationName === "—" && "text-muted-foreground",
                          )}
                        >
                          {row.locationName}
                        </td>
                        <td className="p-3">
                          {row.lastStatus ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              Offline
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                          >
                            {row.onlineCount} ↑
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className="border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
                          >
                            {row.offlineCount} ↓
                          </Badge>
                        </td>
                        <td className="p-3 tabular-nums">{row.totalEvents}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap text-xs">
                          {row.firstEvent}
                        </td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap text-xs">
                          {row.lastEvent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span className="tabular-nums">
                  Showing {tableFromIdx}–{tableToIdx} of {totalChargers} chargers
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={tablePage <= 0 || loading}
                    onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={tablePage + 1 >= tableTotalPages || loading}
                    onClick={() =>
                      setTablePage((p) =>
                        Math.min(tableTotalPages - 1, p + 1),
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
  const [draftOrgId, setDraftOrgId] = useState("");

  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);
  const [appliedOrgId, setAppliedOrgId] = useState("");

  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AccessLogSummaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows: r, total: t } = await fetchAccessLogSummary({
        from: appliedFrom ? `${appliedFrom}T00:00:00.000Z` : undefined,
        to: appliedTo ? `${appliedTo}T23:59:59.999Z` : undefined,
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
  }, [appliedFrom, appliedTo, appliedOrgId, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClear = () => {
    const d = defaultDateRangeInputs();
    setDraftFrom(d.from);
    setDraftTo(d.to);
    setDraftOrgId("");
    setAppliedFrom(d.from);
    setAppliedTo(d.to);
    setAppliedOrgId("");
    setPage(0);
  };

  const handleApply = () => {
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
    setAppliedOrgId(draftOrgId);
    setPage(0);
  };

  const exportQuery = useMemo(
    () => ({
      from: appliedFrom ? `${appliedFrom}T00:00:00.000Z` : undefined,
      to: appliedTo ? `${appliedTo}T23:59:59.999Z` : undefined,
      organization_id: appliedOrgId || undefined,
    }),
    [appliedFrom, appliedTo, appliedOrgId],
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

      <AccessSummaryTableCard
        rows={rows}
        total={total}
        loading={loading}
        page={page}
        onPageChange={setPage}
        exportCsv={() => runExport("csv")}
        exportPdf={() => runExport("pdf")}
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
            <div className={cn(activeTab !== "chargers" && "hidden")} aria-hidden={activeTab !== "chargers"}>
              <ChargersLogTab orgs={orgs} orgsLoading={orgsLoading} />
            </div>
            <div className={cn(activeTab !== "access" && "hidden")} aria-hidden={activeTab !== "access"}>
              <AccessTab orgs={orgs} orgsLoading={orgsLoading} />
            </div>
          </PermissionGuard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditLog;
