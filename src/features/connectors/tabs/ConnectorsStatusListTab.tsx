import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/shared/AppSelect";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchAllConnectorsStatus,
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsWithStatusByCharger,
  type ConnectorWithStatus,
} from "@/services/api";
import type { SelectOption } from "@/types";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  MoreHorizontal,
  StopCircle,
  Unlock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const CONCURRENCY = 15;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export interface ConnectorStatusRow {
  organizationName: string;
  locationName: string;
  chargerId: string;
  chargerName: string;
  connectorId: string;
  connectorType: string;
  status: string;
}

type ConnectorCommand = "unlock" | "stop_session";

interface ConnectorCommandPayload {
  chargerId: number | string;
  connectorId: number | string;
  command: ConnectorCommand;
}

interface ConnectorAction {
  label: string;
  icon: LucideIcon;
  command: ConnectorCommand;
  confirm: string;
  disabled?: (connector: ConnectorStatusRow) => boolean;
}

const connectorActions: ConnectorAction[] = [
  {
    label: "Unlock Connector",
    icon: Unlock,
    command: "unlock",
    confirm: "Unlock this connector?",
    disabled: (connector) => connector.status.toLowerCase() === "available",
  },
  {
    label: "Stop Session",
    icon: StopCircle,
    command: "stop_session",
    confirm: "Stop the active session on this connector?",
    disabled: (connector) => connector.status.toLowerCase() !== "busy",
  },
];

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const isAvailable = s === "available" || s === "online";
  const isUnavailable = s === "unavailable" || s === "offline";
  const isFaulted = s === "faulted" || s === "error";
  const isCharging = s === "charging" || s === "busy";

  const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-black/5 shadow-sm";
  return (
    <span
      className={cn(
        base,
        isAvailable && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        isUnavailable && "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
        isFaulted && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        isCharging && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        !isAvailable && !isUnavailable && !isFaulted && !isCharging && "bg-muted text-muted-foreground"
      )}
    >
      {status || "—"}
    </span>
  );
}

async function runChunked<T, R>(
  items: T[],
  fn: (item: T) => Promise<R[]>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map(fn));
    results.forEach((arr) => out.push(...arr));
  }
  return out;
}

interface ConnectorsStatusListTabProps {
  refreshKey?: number;
}

export function ConnectorsStatusListTab({ refreshKey = 0 }: ConnectorsStatusListTabProps) {
  const [rows, setRows] = useState<ConnectorStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const fastRows = await fetchAllConnectorsStatus();
      if (fastRows.length > 0) {
        setRows(
          fastRows.map((c) => {
            const row = c as unknown as {
              connectorId?: number | string;
              connectorType?: string;
              status?: string;
              chargerId?: number | string;
              chargerName?: string;
              locationName?: string;
              organizationName?: string;
            };
            return {
              organizationName: String(row.organizationName ?? "—"),
              locationName: String(row.locationName ?? "—"),
              chargerId: String(row.chargerId ?? "—"),
              chargerName: String(row.chargerName ?? "—"),
              connectorId: String(row.connectorId ?? "—"),
              connectorType: String(row.connectorType ?? "—"),
              status: row.status ?? "—",
            };
          })
        );
        return;
      }

      const orgs: SelectOption[] = await fetchChargerOrganizations();
      const locationResults = await Promise.all(orgs.map((o) => fetchLocationsByOrg(o.value)));
      const allLocations: { locationId: string; locationName: string; organizationName: string }[] = [];
      for (let i = 0; i < orgs.length; i++) {
        for (const loc of locationResults[i]) {
          allLocations.push({
            locationId: loc.value,
            locationName: loc.label,
            organizationName: orgs[i].label,
          });
        }
      }

      const chargerResults = await Promise.all(
        allLocations.map((loc) => fetchChargersByLocation(loc.locationId))
      );
      const allChargers: {
        chargerId: string;
        chargerName: string;
        locationName: string;
        organizationName: string;
      }[] = [];
      for (let i = 0; i < allLocations.length; i++) {
        const loc = allLocations[i];
        for (const c of chargerResults[i]) {
          allChargers.push({
            chargerId: c.value,
            chargerName: c.label,
            locationName: loc.locationName,
            organizationName: loc.organizationName,
          });
        }
      }

      const connectorRows = await runChunked(
        allChargers,
        async ({ chargerId, chargerName, locationName, organizationName }) => {
          const connectors: ConnectorWithStatus[] = await fetchConnectorsWithStatusByCharger(chargerId);
          return connectors.map((c) => ({
            organizationName,
            locationName,
            chargerId,
            chargerName,
            connectorId: String(c.connector_id ?? c.id ?? "—"),
            connectorType: String(c.type ?? "—"),
            status: c.status ?? "—",
          }));
        }
      );

      setRows(connectorRows);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll, refreshKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.organizationName.toLowerCase().includes(q) ||
        r.locationName.toLowerCase().includes(q) ||
        r.chargerName.toLowerCase().includes(q) ||
        String(r.connectorId).toLowerCase().includes(q) ||
        r.connectorType.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const visible = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const rangeText =
    total === 0
      ? "0-0 of 0"
      : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`;

  const handleConnectorAction = useCallback(async (payload: ConnectorCommandPayload, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    const key = `${payload.chargerId}-${payload.connectorId}-${payload.command}`;
    setActionLoading(key);
    try {
      const res = await fetch("/api/v4/dashboard/charger-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      const success = res.ok && data.success !== false;
      toast({
        title: success ? "Command sent" : "Command failed",
        description: data.message || (success ? "Command sent successfully" : "Could not send command."),
        variant: success ? "default" : "destructive",
      });
    } catch {
      toast({
        title: "Error",
        description: "Could not send command.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }, []);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Connectors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error.message}
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void loadAll()}>
              Retry
            </Button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by Organization, Location, Charger, Connector..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {loading && rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        ) : total === 0 ? (
          <EmptyState title="No Connectors" description="No connectors found." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Organization</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Charger</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Connector ID</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    (() => {
                      const rowBusy = actionLoading != null && actionLoading.startsWith(`${r.chargerId}-${r.connectorId}-`);
                      return (
                    <tr
                      key={`${r.chargerId}-${r.connectorId}`}
                      className="hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">{r.organizationName}</td>
                      <td className="py-3 px-4">{r.locationName}</td>
                      <td className="py-3 px-4">{r.chargerName}</td>
                      <td className="py-3 px-4 font-mono text-xs">{r.connectorId}</td>
                      <td className="py-3 px-4">{r.connectorType || "—"}</td>
                      <td className="py-3 px-4">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-8 w-8 shrink-0 p-0 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                disabled={rowBusy}
                                aria-label="Connector actions"
                              >
                                {rowBusy ? (
                                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{r.connectorType || "Connector"}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {connectorActions.map((action) => {
                                const Icon = action.icon;
                                const disabled = action.disabled?.(r) ?? false;
                                return (
                                  <DropdownMenuItem
                                    key={action.command}
                                    disabled={disabled}
                                    className={
                                      action.command === "stop_session"
                                        ? "text-destructive focus:text-destructive focus:bg-destructive/10"
                                        : ""
                                    }
                                    onSelect={() => {
                                      if (disabled) return;
                                      void handleConnectorAction(
                                        {
                                          chargerId: r.chargerId,
                                          connectorId: r.connectorId,
                                          command: action.command,
                                        },
                                        action.confirm
                                      );
                                    }}
                                  >
                                    <Icon className="h-4 w-4 mr-2" aria-hidden />
                                    {action.label}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Items per page</span>
                <AppSelect
                  options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                  value={String(pageSize)}
                  onChange={(v) => {
                    const next = Number(v);
                    if (!Number.isFinite(next) || !PAGE_SIZE_OPTIONS.includes(next as (typeof PAGE_SIZE_OPTIONS)[number])) return;
                    setPageSize(next as (typeof PAGE_SIZE_OPTIONS)[number]);
                    setPage(1);
                  }}
                  placeholder="Page size"
                  size="sm"
                  className="w-[88px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span>{rangeText}</span>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
