import { DashboardLayout } from "@/components/DashboardLayout";
import { TrayIcons } from "@/components/dashboard/TrayIcons";
import { GlanceSection } from "@/components/dashboard/GlanceSection";
import { SessionTables } from "@/components/dashboard/SessionTables";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";

const Dashboard = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AdminDashboard />

        <TrayIcons />
        <GlanceSection />

        <PermissionGuard 
          role={role} 
          permission="charger.status" 
          action="read"
        >
          <SessionTables />
        </PermissionGuard>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
