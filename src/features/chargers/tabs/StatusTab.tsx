import { useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useChargerStatus } from "../hooks/useChargerStatus";
import { Loader2, MoreHorizontal, Power, PowerOff, RefreshCw, Search, StopCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Charger } from "@/types";
import { postDashboardChargerCommand, toggleChargerEnabled } from "@/services/api";
import type { PermissionKey } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusTabProps {
  activeTab: string;
  role: string | null;
  canRead: (permission: string) => boolean;
  canWrite?: (permission: PermissionKey) => boolean;
  refreshKey?: number;
  onRefreshRequest?: () => void;
}

type ChargerListRow = Charger & { listStatus: "online" | "offline" };
type ChargerCommand = "restart" | "stop_all";

interface ChargerCommandPayload {
  chargerId: number | string;
  command: ChargerCommand;
}

interface ChargerAction {
  label: string;
  icon: LucideIcon;
  command: ChargerCommand;
  confirm: string;
  destructive?: boolean;
}

const chargerActions: ChargerAction[] = [
  {
    label: "Restart Charger",
    icon: RefreshCw,
    command: "restart",
    confirm: "Are you sure you want to restart this charger?",
  },
  {
    label: "Stop All Sessions",
    icon: StopCircle,
    command: "stop_all",
    confirm: "Stop all active sessions on this charger?",
    destructive: true,
  },
];

function chargerTableEmptyMessage(
  isLoading: boolean,
  sourceLength: number,
  filteredLength: number,
  noDataLabel: string
): string {
  if (isLoading && sourceLength === 0) return "Loading…";
  if (sourceLength > 0 && filteredLength === 0) return "No matching chargers";
  return noDataLabel;
}

function formatChargerTimeEnGB(time: string): string {
  if (!time) return "N/A";
  try {
    return new Date(time).toLocaleString("en-GB");
  } catch {
    return time;
  }
}

function chargerRowIsEnabled(row: Charger): boolean {
  const e = row.enabled;
  if (e === undefined || e === null) return true;
  return e === true || e === 1;
}

export function StatusTab({
  activeTab,
  role,
  canRead,
  canWrite,
  refreshKey = 0,
  onRefreshRequest,
}: StatusTabProps) {
  const { offlineChargers, onlineChargers, isLoadingStatus, statusSearch, setStatusSearch } =
    useChargerStatus(activeTab, canRead, refreshKey);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const canToggleCharger = canWrite?.("charger.enable_disable") ?? false;
  const canOcppCommands = canWrite?.("charger.enable_disable") ?? false;

  const handleToggleChargerEnabled = useCallback(
    async (row: ChargerListRow) => {
      const chargerId = row.id;
      if (!chargerId) return;
      const currentlyEnabled = chargerRowIsEnabled(row);
      const nextEnabled = !currentlyEnabled;
      const confirmText = nextEnabled
        ? `Are you sure you want to enable charger ${row.name}?`
        : `Are you sure you want to disable charger ${row.name}?`;
      if (!window.confirm(confirmText)) return;
      const key = `${chargerId}-toggle`;
      setActionLoading(key);
      try {
        const result = await toggleChargerEnabled(chargerId, nextEnabled);
        toast({
          title: result.success ? "Success" : "Failed",
          description: result.message,
          variant: result.success ? "default" : "destructive",
        });
        if (result.success) onRefreshRequest?.();
      } catch {
        toast({
          title: "Error",
          description: "Could not update charger.",
          variant: "destructive",
        });
      } finally {
        setActionLoading(null);
      }
    },
    [onRefreshRequest]
  );

  const handleAction = useCallback(async (payload: ChargerCommandPayload, confirmText: string) => {
    if (!canOcppCommands) return;
    if (!window.confirm(confirmText)) return;
    const key = `${payload.chargerId}-${payload.command}`;
    setActionLoading(key);
    try {
      const res = await postDashboardChargerCommand({
        chargerId: payload.chargerId,
        command: payload.command,
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
  }, [canOcppCommands]);

  const allRows: ChargerListRow[] = useMemo(() => {
    const offline = offlineChargers
      .map((c) => ({ ...c, listStatus: "offline" as const }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const online = onlineChargers
      .map((c) => ({ ...c, listStatus: "online" as const }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...offline, ...online];
  }, [offlineChargers, onlineChargers]);

  const q = statusSearch.trim().toLowerCase();
  const filteredRows = useMemo(
    () =>
      allRows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)),
    [allRows, q]
  );

  return (
    <PermissionGuard
      permission="charger.status"
      action="read"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to view charger status."
          />
        </div>
      }
    >
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chargers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search chargers by name or ID"
              value={statusSearch}
              onChange={(e) => setStatusSearch(e.target.value)}
              className="w-full pl-10 bg-background"
            />
          </div>

          <div className="relative min-h-[120px] rounded-lg [&_thead_th:last-child]:w-12 [&_thead_th:last-child]:text-center [&_tbody_td:last-child]:text-center">
            {isLoadingStatus && allRows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
            ) : !isLoadingStatus && filteredRows.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/25 px-6 py-16 text-center"
                role="status"
              >
                <p className="text-sm font-medium text-foreground">No chargers found</p>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
                  Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <>
                <DataTable<ChargerListRow>
                  data={filteredRows}
                  columns={[
                    {
                      key: "name",
                      header: "Name",
                      render: (row) => {
                        const isEnabled = chargerRowIsEnabled(row);
                        return (
                          <div
                            className={cn(
                              "flex flex-wrap items-center gap-2",
                              !isEnabled && "opacity-70"
                            )}
                          >
                            <span>{row.name}</span>
                            {!isEnabled ? (
                              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                                Disabled
                              </Badge>
                            ) : null}
                          </div>
                        );
                      },
                    },
                    {
                      key: "id",
                      header: "ID",
                      render: (row) => <span className="font-mono text-xs tabular-nums">{row.id}</span>,
                    },
                    {
                      key: "time",
                      header: "Time",
                      render: (row) => formatChargerTimeEnGB(row.time),
                    },
                    {
                      key: "listStatus",
                      header: "Status",
                      render: (row) =>
                        row.listStatus === "offline" ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold tracking-tight text-red-800 shadow-sm ring-2 ring-red-200/80 ring-offset-1 ring-offset-background dark:bg-red-950/50 dark:text-red-100 dark:ring-red-800/60">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.25)]"
                              aria-hidden
                            />
                            Offline
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-tight text-emerald-800 shadow-sm ring-2 ring-emerald-200/80 ring-offset-1 ring-offset-background dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-800/60">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]"
                              aria-hidden
                            />
                            Online
                          </span>
                        ),
                    },
                    {
                      key: "actions",
                      header: "Actions",
                      render: (row) => {
                        const chargerId = row.id;
                        const rowBusy = actionLoading != null && actionLoading.startsWith(`${chargerId}-`);
                        const isEnabled = chargerRowIsEnabled(row);
                        const ToggleIcon = isEnabled ? PowerOff : Power;

                        return (
                          <div className="flex justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0 p-0 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  disabled={rowBusy}
                                  aria-label="Charger actions"
                                >
                                  {rowBusy ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{row.name}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <>
                                  <DropdownMenuItem
                                    className={
                                      isEnabled
                                        ? "text-amber-700 focus:text-amber-700 focus:bg-amber-500/10 dark:text-amber-400"
                                        : "text-emerald-700 focus:text-emerald-700 focus:bg-emerald-500/10 dark:text-emerald-400"
                                    }
                                    disabled={rowBusy || !canToggleCharger}
                                    title={
                                      canToggleCharger
                                        ? undefined
                                        : "Read-only access. Contact your administrator."
                                    }
                                    onSelect={() => {
                                      void handleToggleChargerEnabled(row);
                                    }}
                                  >
                                    <ToggleIcon className="h-4 w-4 mr-2" aria-hidden />
                                    {isEnabled ? "Disable Charger" : "Enable Charger"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                                {chargerActions.map((action) => {
                                  const Icon = action.icon;
                                  return (
                                    <DropdownMenuItem
                                      key={action.command}
                                      className={
                                        action.destructive
                                          ? "text-destructive focus:text-destructive focus:bg-destructive/10"
                                          : ""
                                      }
                                      disabled={!canOcppCommands}
                                      title={
                                        canOcppCommands
                                          ? undefined
                                          : "Read-only access. Contact your administrator."
                                      }
                                      onSelect={() => {
                                        void handleAction(
                                          { chargerId, command: action.command },
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
                        );
                      },
                    },
                  ]}
                  emptyMessage={chargerTableEmptyMessage(
                    isLoadingStatus,
                    allRows.length,
                    filteredRows.length,
                    "No chargers"
                  )}
                  showSearch={false}
                  headerRowClassName="bg-muted/30"
                  tableWrapperClassName="rounded-lg"
                  bodyCellClassName="py-[0.875rem] px-4 align-middle"
                  bodyRowClassName="border-0 transition-colors duration-150 hover:bg-muted/45"
                  paginationClassName="mt-2"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}
