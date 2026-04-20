import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SETUP_WIZARD_STATE_KEY } from "@/components/SetupWizard";
import { PageTabs } from "@/components/shared/PageTabs";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { StatusTab } from "@/features/chargers/tabs/StatusTab";
import { AddChargerTab } from "@/features/chargers/tabs/AddChargerTab";

const tabs = [
  { id: "status", label: "Status" },
  { id: "add", label: "Add / Update Chargers" },
];

const Chargers = () => {
  const { user } = useAuth();
  const location = useLocation();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead, canWrite } = usePermission(role);
  const [activeTab, setActiveTab] = useState("status");
  const [selectedCharger, setSelectedCharger] = useState("__NEW_CHARGER__");
  const [statusRefreshKey, setStatusRefreshKey] = useState(0);

  useEffect(() => {
    const tab = (location.state as Record<string, string>)?.[SETUP_WIZARD_STATE_KEY];
    if (tab === "add") setActiveTab("add");
  }, [location.state]);

  const breadcrumb = "ION Dashboard / Chargers";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Chargers</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Monitor charger status and add new chargers
          </p>

          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">
            {breadcrumb}
          </div>
        </div>

        <div className="pt-2">
          {activeTab === "status" && (
            <StatusTab
              activeTab={activeTab}
              role={role}
              canRead={canRead}
              canWrite={canWrite}
              refreshKey={statusRefreshKey}
              onRefreshRequest={() => setStatusRefreshKey((k) => k + 1)}
            />
          )}

          {activeTab === "add" && (
            <AddChargerTab
              activeTab={activeTab}
              role={role}
              canRead={canRead}
              selectedCharger={selectedCharger}
              setSelectedCharger={setSelectedCharger}
              onChargerSaved={() => setStatusRefreshKey((k) => k + 1)}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chargers;
