import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { SchedulingPanel } from "@/components/operations/SchedulingPanel";

interface SchedulingTabProps {
  role: string | null;
  chargerId: string | undefined;
}

export function SchedulingTab({ role, chargerId }: SchedulingTabProps) {
  return (
    <PermissionGuard
      role={role}
      permission="charger.schedule"
      action="read"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to view schedules."
          />
        </div>
      }
    >
      <SchedulingPanel chargerId={chargerId} />
    </PermissionGuard>
  );
}
