import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useChargerStatus } from "../hooks/useChargerStatus";
import { Loader2, Search } from "lucide-react";
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
              placeholder="Search by name or ID"
              value={statusSearch}
              onChange={(e) => setStatusSearch(e.target.value)}
              className="w-full pl-10"
            />
          </div>

          <div className="relative min-h-[120px] rounded-lg">
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
                      <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]"
                          aria-hidden
                        />
                        Offline
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"
                          aria-hidden
                        />
                        Online
                      </span>
                    ),
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
              bodyCellClassName="py-3 px-4"
              bodyRowClassName="border-0 hover:bg-muted/50"
              paginationClassName="mt-2"
            />
          </div>
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}
