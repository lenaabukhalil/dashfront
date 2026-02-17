import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { useLeadershipUsers } from "../hooks/useLeadershipUsers";
import type { User } from "@/types";

const columns = [
  { key: "firstName" as const, header: "First Name" },
  { key: "lastName" as const, header: "Last Name" },
  { key: "count" as const, header: "Count" },
  { key: "mobile" as const, header: "Mobile" },
  {
    key: "energy" as const,
    header: "Energy",
    render: (u: User) => `${u.energy.toLocaleString()} kWh`,
  },
  {
    key: "amount" as const,
    header: "Amount (JOD)",
    render: (u: User) => `${u.amount.toLocaleString()} JOD`,
  },
];

interface LeadershipTabProps {
  role: string | null;
  canRead: (permission: string) => boolean;
}

export function LeadershipTab({ role, canRead }: LeadershipTabProps) {
  const { users, loadingUsers } = useLeadershipUsers(canRead);

  return (
    <PermissionGuard
      role={role}
      permission="users.edit"
      action="read"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to view users."
          />
        </div>
      }
    >
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        {loadingUsers ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : users.length === 0 ? (
          <EmptyState title="No Users" description="No users found." />
        ) : (
          <DataTable columns={columns} data={users} pagination={false} />
        )}
      </div>
    </PermissionGuard>
  );
}
