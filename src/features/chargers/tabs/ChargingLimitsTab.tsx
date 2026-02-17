import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChargingLimits } from "@/components/operations/ChargingLimits";

interface ChargingLimitsTabProps {
  role: string | null;
  chargerId: string | undefined;
}

export function ChargingLimitsTab({ role, chargerId }: ChargingLimitsTabProps) {
  return (
    <PermissionGuard
      role={role}
      permission="charger.chargerControl"
      action="write"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to set charging limits."
          />
        </div>
      }
    >
      <ChargingLimits chargerId={chargerId} />
    </PermissionGuard>
  );
}
