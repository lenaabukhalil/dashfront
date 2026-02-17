import { DashboardLayout } from "@/components/DashboardLayout";
import { TrayIcons } from "@/components/dashboard/TrayIcons";
import { GlanceSection } from "@/components/dashboard/GlanceSection";
import { LocationControl } from "@/components/dashboard/LocationControl";
import { UserInfo } from "@/components/dashboard/UserInfo";
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <LocationControl />
            <div className="lg:col-span-2">
              <UserInfo />
            </div>
          </div>
        </PermissionGuard>

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
