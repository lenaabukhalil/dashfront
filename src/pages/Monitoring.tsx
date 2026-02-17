import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { StatusDashboard } from "@/components/monitoring/StatusDashboard";
import { ActiveSessionsView } from "@/components/monitoring/ActiveSessionsView";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";

const tabs = [
  { id: "status", label: "Status Dashboard" },
  { id: "sessions", label: "Active Sessions" },
];

const Monitoring = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead, canWrite } = usePermission(role);
  const [activeTab, setActiveTab] = useState("status");
  const [tabLoading, setTabLoading] = useState(true);

  useEffect(() => {
    if (activeTab === "status" || activeTab === "sessions") {
      setTabLoading(true);
    } else {
      setTabLoading(false);
    }
  }, [activeTab]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Monitoring</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Real-time monitoring of charger status and active charging sessions.
          </p>
          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <PermissionGuard
          role={role}
          permission="charger.status"
          action="read"
          fallback={
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  title="Access Denied"
                  description="You don't have permission to access monitoring."
                />
              </CardContent>
            </Card>
          }
        >
          {activeTab === "status" && (
            <>
              {tabLoading && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent>
                </Card>
              )}
              <div className={tabLoading ? "hidden" : "block"}>
                <StatusDashboard onLoadingChange={setTabLoading} />
              </div>
            </>
          )}

          {activeTab === "sessions" && (
            <>
              {tabLoading && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Loading...
                  </CardContent>
                </Card>
              )}
              <div className={tabLoading ? "hidden" : "block"}>
                <ActiveSessionsView onLoadingChange={setTabLoading} />
              </div>
            </>
          )}
        </PermissionGuard>
      </div>
    </DashboardLayout>
  );
};

export default Monitoring;
