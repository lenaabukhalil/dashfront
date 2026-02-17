import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useChargerStatus } from "../hooks/useChargerStatus";

interface StatusTabProps {
  activeTab: string;
  role: string | null;
  canRead: (permission: string) => boolean;
  refreshKey?: number;
}

export function StatusTab({ activeTab, role, canRead, refreshKey = 0 }: StatusTabProps) {
  const {
    offlineChargers,
    onlineChargers,
    isLoadingStatus,
    statusSearchOffline,
    setStatusSearchOffline,
    statusSearchOnline,
    setStatusSearchOnline,
  } = useChargerStatus(activeTab, canRead, refreshKey);

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="mb-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-red-700 shadow-sm ring-1 ring-red-100">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]" />
                <span className="text-sm font-semibold tracking-tight">Offline</span>
              </div>
            </div>
            <div className="relative">
              <Input
                placeholder="Search"
                value={statusSearchOffline}
                onChange={(e) => setStatusSearchOffline(e.target.value)}
                className="pl-8"
              />
              <svg
                className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          {isLoadingStatus ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <DataTable
              data={offlineChargers.filter(
                (c) =>
                  c.name.toLowerCase().includes(statusSearchOffline.toLowerCase()) ||
                  c.id.toLowerCase().includes(statusSearchOffline.toLowerCase())
              )}
              columns={[
                { key: "name", header: "Name", render: (row) => row.name },
                { key: "id", header: "ID", render: (row) => row.id },
                {
                  key: "time",
                  header: "Time",
                  render: (row) => {
                    if (!row.time) return "N/A";
                    try {
                      return new Date(row.time).toLocaleString();
                    } catch {
                      return row.time;
                    }
                  },
                },
              ]}
              showSearch={false}
            />
          )}
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="mb-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
                <span className="text-sm font-semibold tracking-tight">Online</span>
              </div>
            </div>
            <div className="relative">
              <Input
                placeholder="Search"
                value={statusSearchOnline}
                onChange={(e) => setStatusSearchOnline(e.target.value)}
                className="pl-8"
              />
              <svg
                className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          {isLoadingStatus ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <DataTable
              data={onlineChargers.filter(
                (c) =>
                  c.name.toLowerCase().includes(statusSearchOnline.toLowerCase()) ||
                  c.id.toLowerCase().includes(statusSearchOnline.toLowerCase())
              )}
              columns={[
                { key: "name", header: "Name", render: (row) => row.name },
                { key: "id", header: "ID", render: (row) => row.id },
                {
                  key: "time",
                  header: "Time",
                  render: (row) => {
                    if (!row.time) return "N/A";
                    try {
                      return new Date(row.time).toLocaleString();
                    } catch {
                      return row.time;
                    }
                  },
                },
              ]}
              showSearch={false}
            />
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
