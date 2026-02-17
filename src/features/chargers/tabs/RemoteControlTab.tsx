import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { RemoteControl } from "@/components/operations/RemoteControl";

interface RemoteControlTabProps {
  role: string | null;
}

export function RemoteControlTab({ role }: RemoteControlTabProps) {
  return (
    <PermissionGuard
      role={role}
      permission="charger.chargerControl"
      action="write"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to control chargers."
          />
        </div>
      }
    >
      <RemoteControl />
    </PermissionGuard>
  );
}
