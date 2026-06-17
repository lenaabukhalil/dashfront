import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChargingUsers } from "../hooks/useChargingUsers";
import { ChargingUserDetail } from "../components/ChargingUserDetail";
import { LiveActivityStrip } from "@/components/users/LiveActivityStrip";
import type { ChargingUserListItem } from "@/services/api";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatAmount(value: number | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "-";
}

function formatEnergy(value: number | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "-";
}

function statusBadgeClass(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "active") {
    return "border-transparent bg-emerald-600/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
  }
  if (s === "suspended") {
    return "border-transparent bg-amber-600/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200";
  }
  if (s === "disabled") {
    return "border-transparent bg-red-600/15 text-red-800 dark:bg-red-500/20 dark:text-red-300";
  }
  return "";
}

function userDisplayName(user: ChargingUserListItem): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name || "-";
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

interface ChargingUsersTabProps {
  role: string | null;
}

export function ChargingUsersTab({ role }: ChargingUsersTabProps) {
  const {
    rows,
    loading,
    error,
    search,
    setSearch,
    submitSearch,
    reload,
    activeQuery,
    isIdle,
  } = useChargingUsers();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, rows.length]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const visibleRows = useMemo(
    () => rows.slice(start, end),
    [rows, start, end],
  );

  const rangeText =
    total === 0 ? "0-0 of 0" : `${start + 1}-${end} of ${total}`;

  const openDetail = (userId: number) => {
    setSelectedUserId(userId);
    setDetailOpen(true);
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
            description="You don't have permission to view charging users."
          />
        </div>
      }
    >
      <div className="space-y-4">
        <LiveActivityStrip />
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitSearch();
              }
            }}
            placeholder="Search by name or mobile…"
            className="pl-9"
            aria-label="Search charging users"
          />
        </div>

        {error ? (
          <div className="flex flex-wrap items-center gap-3" role="alert">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              Retry
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
          </div>
        ) : isIdle ? (
          <EmptyState
            title="Search for a user"
            description="Search for a user by name or mobile to begin."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No users found"
            description={
              activeQuery
                ? `No users found for '${activeQuery}'.`
                : "No users matched your search."
            }
          />
        ) : (
          <>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Balance (JOD)</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Energy (kWh)</TableHead>
                    <TableHead>Amount (JOD)</TableHead>
                    <TableHead>Last Session</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((user) => (
                    <TableRow
                      key={user.user_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(user.user_id)}
                    >
                      <TableCell className="font-medium">{userDisplayName(user)}</TableCell>
                      <TableCell>{user.mobile || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("font-medium", statusBadgeClass(user.status))}
                        >
                          {user.status || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatAmount(user.balance)}</TableCell>
                      <TableCell>{user.sessions_count}</TableCell>
                      <TableCell>{formatEnergy(user.total_kwh)}</TableCell>
                      <TableCell>{formatAmount(user.total_amount)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(user.last_session)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {total > 0 ? (
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline">Items per page</span>
                  <AppSelect
                    options={PAGE_SIZE_OPTIONS.map((n) => ({
                      value: String(n),
                      label: String(n),
                    }))}
                    value={String(pageSize)}
                    onChange={(v) => {
                      const next = Number(v);
                      if (!Number.isFinite(next)) return;
                      if (!PAGE_SIZE_OPTIONS.includes(next as (typeof PAGE_SIZE_OPTIONS)[number])) {
                        return;
                      }
                      setPageSize(next as (typeof PAGE_SIZE_OPTIONS)[number]);
                      setPage(1);
                    }}
                    placeholder="Page size"
                    size="sm"
                    className="w-[88px]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{rangeText}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(1)}
                      disabled={page <= 1}
                      aria-label="First page"
                      title="First page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      aria-label="Previous page"
                      title="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      disabled={page >= pageCount}
                      aria-label="Next page"
                      title="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(pageCount)}
                      disabled={page >= pageCount}
                      aria-label="Last page"
                      title="Last page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
        </div>
      </div>

      <ChargingUserDetail
        userId={selectedUserId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </PermissionGuard>
  );
}
