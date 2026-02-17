import { DashboardLayout } from "@/components/DashboardLayout";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { useSupportData } from "@/features/support/hooks/useSupportData";
import { MaintenanceTicketsTab } from "@/features/support/tabs/MaintenanceTicketsTab";

const Support = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const supportData = useSupportData();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Support & Maintenance</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage maintenance tickets, firmware upgrades, and SLA compliance
          </p>
        </div>
        <MaintenanceTicketsTab role={role} data={supportData} />
      </div>
    </DashboardLayout>
  );
};

export default Support;
