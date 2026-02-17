import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import type { Organization } from "@/types";

const columns = [
  { key: "id" as const, header: "ID" },
  { key: "name" as const, header: "Name" },
  {
    key: "amount" as const,
    header: "Amount (JOD)",
    render: (org: Organization) => {
      const amount =
        typeof org.amount === "number" ? org.amount : parseFloat(String(org.amount || 0));
      return amount.toLocaleString("en-US", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
    },
  },
  {
    key: "energy" as const,
    header: "Energy",
    render: (org: Organization) => {
      const energy =
        typeof org.energy === "number" ? org.energy : parseFloat(String(org.energy || 0));
      return `${energy.toLocaleString("en-US", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })} kWh`;
    },
  },
];

interface OrganizationsOverviewTabProps {
  organizations: Organization[];
  loading: boolean;
  error: string | null;
  role: string | null;
  onClearError: () => void;
}

export function OrganizationsOverviewTab({
  organizations,
  loading,
  error,
  role,
  onClearError,
}: OrganizationsOverviewTabProps) {
  return (
    <PermissionGuard
      role={role}
      permission="org.name"
      action="read"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to view organizations."
          />
        </div>
      }
    >
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        {error ? (
          <div className="py-8 text-center">
            <p className="text-destructive mb-2 font-semibold">Connection Error</p>
            <p className="text-sm text-muted-foreground mb-4">Cannot connect to backend API</p>
            <div className="text-left max-w-md mx-auto bg-muted p-4 rounded-lg mb-4">
                <p className="text-sm font-medium mb-2">Please check:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Is the API endpoint configured correctly?</li>
                  <li>Check CORS settings in the backend</li>
                  <li>Verify network connectivity</li>
                </ul>
              </div>
            <button
              onClick={onClearError}
              className="text-sm text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : loading && organizations.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading organizations...
          </div>
        ) : organizations.length === 0 ? (
          <EmptyState
            title="No Organizations"
            description="No organizations found. Add your first organization to get started."
          />
        ) : (
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={organizations}
              searchPlaceholder="Search organizations..."
              showSearch={true}
            />
            {loading && (
              <div className="text-xs text-muted-foreground text-center">Refreshing data...</div>
            )}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
