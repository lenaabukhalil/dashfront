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
import { Loader2, MoreHorizontal, RotateCcw, Search, StopCircle, Unlock } from "lucide-react";
import { sendChargerCommand } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { Charger } from "@/types";

interface StatusTabProps {
  activeTab: string;
  role: string | null;
  canRead: (permission: string) => boolean;
  refreshKey?: number;
}

type ChargerListRow = Charger & { listStatus: "online" | "offline" };

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

export function StatusTab({ activeTab, role, canRead, refreshKey = 0 }: StatusTabProps) {
  const { offlineChargers, onlineChargers, isLoadingStatus, statusSearch, setStatusSearch } =
    useChargerStatus(activeTab, canRead, refreshKey);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = useCallback(async (chargerId: string, action: "restart" | "stop" | "unlock") => {
    const key = `${chargerId}-${action}`;
    setActionLoading(key);
    try {
      const result = await sendChargerCommand(chargerId, action);
      toast({
        title: result.success ? "Command sent" : "Command failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
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
      role={role}
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
            {!isLoadingStatus && filteredRows.length === 0 ? (
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
                {isLoadingStatus && (
                  <div
                    className="absolute inset-0 z-10 flex justify-center pt-6 rounded-lg bg-background/55 backdrop-blur-[1px] pointer-events-none"
                    aria-busy="true"
                    role="status"
                  >
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                    <span className="sr-only">Refreshing charger status</span>
                  </div>
                )}
                <DataTable<ChargerListRow>
                  data={filteredRows}
                  columns={[
                    { key: "name", header: "Name", render: (row) => row.name },
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
                                <DropdownMenuItem
                                  onSelect={() => {
                                    void handleAction(chargerId, "restart");
                                  }}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2 text-amber-500" aria-hidden />
                                  Restart charger
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => {
                                    void handleAction(chargerId, "unlock");
                                  }}
                                >
                                  <Unlock className="h-4 w-4 mr-2 text-blue-500" aria-hidden />
                                  Unlock connector
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={row.listStatus !== "online"}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onSelect={() => {
                                    void handleAction(chargerId, "stop");
                                  }}
                                >
                                  <StopCircle className="h-4 w-4 mr-2" aria-hidden />
                                  Stop session
                                </DropdownMenuItem>
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
