import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { RevenueSharingTab } from "@/features/reports/tabs/RevenueSharingTab";
import { ComparisonTab } from "@/features/reports/tabs/ComparisonTab";
import { ConnectorComparisonTab } from "@/features/reports/tabs/ConnectorComparisonTab";
import { PieChart, GitCompare, Plug } from "lucide-react";

const tabs = [
  { id: "revenue-sharing", label: "Revenue Sharing", icon: PieChart },
  { id: "comparison", label: "Charger Comparison", icon: GitCompare },
  { id: "connector-comparison", label: "Connector Comparison", icon: Plug },
];

const Reports = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);
  const [activeTab, setActiveTab] = useState("revenue-sharing");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </header>

        <div className="pt-2">
          <PermissionGuard
            role={role}
            permission="finance.reports"
            action="read"
            fallback={
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to view financial reports."
                  />
                </CardContent>
              </Card>
            }
          >
            {activeTab === "revenue-sharing" && <RevenueSharingTab />}
            {activeTab === "comparison" && <ComparisonTab />}
            {activeTab === "connector-comparison" && <ConnectorComparisonTab />}
          </PermissionGuard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
