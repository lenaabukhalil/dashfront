import { useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TrayIcons } from "@/components/dashboard/TrayIcons";
import { GlanceSection } from "@/components/dashboard/GlanceSection";
import { LocationControl } from "@/components/dashboard/LocationControl";
import { UserInfo } from "@/components/dashboard/UserInfo";
import { SessionTables } from "@/components/dashboard/SessionTables";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { OperatorDashboard } from "@/components/dashboard/OperatorDashboard";
import { AccountantDashboard } from "@/components/dashboard/AccountantDashboard";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";

const Dashboard = () => {
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);

  useEffect(() => {
    // Add welcome notification on first load
    if (user) {
      addNotification({
        title: "Welcome to ION Dashboard",
        message: `Hello ${user.firstName} ${user.lastName}! You're logged in.`,
        type: "info",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const renderRoleSpecificDashboard = () => {
    if (!user) return null;

    switch (user.userType) {
      case 1: // Admin
        return <AdminDashboard />;
      case 2: // Manager
        return <OperatorDashboard />; // Manager can use Operator dashboard for now
      case 3: // Engineer
        return <OperatorDashboard />; // Engineer can use Operator dashboard for now
      case 4: // Operator
        return <OperatorDashboard />;
      case 5: // Accountant
        return <AccountantDashboard />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Role-specific dashboard */}
        {renderRoleSpecificDashboard()}

        {/* Common Components - Show for all roles */}
        <TrayIcons />
        <GlanceSection />

        {/* Location Control & User Info - Show based on permissions */}
        <PermissionGuard 
          role={role} 
          permission="charger.chargerStatus" 
          action="read"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <LocationControl />
            <div className="lg:col-span-2">
              <UserInfo />
            </div>
          </div>
        </PermissionGuard>

        {/* Active Sessions Tables - Show based on permissions */}
        <PermissionGuard 
          role={role} 
          permission="charger.chargerStatus" 
          action="read"
        >
          <SessionTables />
        </PermissionGuard>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
