import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SETUP_WIZARD_STATE_KEY } from "@/components/SetupWizard";
import { PageTabs } from "@/components/shared/PageTabs";
import { ConnectorsTab } from "@/features/connectors/tabs/ConnectorsTab";
import { ConnectorsStatusListTab } from "@/features/connectors/tabs/ConnectorsStatusListTab";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { id: "connectors-status", label: "Connectors Status" },
  { id: "add", label: "Add / Update Connectors" },
];

const Connectors = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canWrite } = usePermission();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("connectors-status");
  const [statusRefreshKey, setStatusRefreshKey] = useState(0);
  const breadcrumb = "ION Dashboard / Connectors";

  useEffect(() => {
    const tab = (location.state as Record<string, string>)?.[SETUP_WIZARD_STATE_KEY];
    if (tab === "add") setActiveTab("add");
  }, [location.state]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Connectors</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage connector configurations and settings
          </p>

          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">{breadcrumb}</div>
        </div>

        <div className="pt-2">
          {activeTab === "add" && (
            <ConnectorsTab
              activeTab={activeTab}
              onConnectorSaved={() => setStatusRefreshKey((k) => k + 1)}
            />
          )}
          {activeTab === "connectors-status" && (
            <ConnectorsStatusListTab
              key={statusRefreshKey}
              refreshKey={statusRefreshKey}
              canWrite={canWrite}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Connectors;
