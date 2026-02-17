import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/features/organizations/hooks/useOrganizations";
import { OrganizationsOverviewTab } from "@/features/organizations/tabs/OrganizationsOverviewTab";
import { AddOrganizationTab } from "@/features/organizations/tabs/AddOrganizationTab";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "add", label: "Organizations" },
];

function getBreadcrumb(activeTab: string) {
  switch (activeTab) {
    case "add":
      return "ION Dashboard / Organizations / Add Organizations";
    case "reports":
      return "ION Dashboard / Organizations / Reports";
    default:
      return "ION Dashboard / Organizations";
  }
}

const Organizations = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);
  const [activeTab, setActiveTab] = useState("overview");

  const { organizations, loading, error, refetch, removeOrganizationById, clearError } = useOrganizations(canRead);

  const handleRetry = () => {
    clearError();
    window.location.reload();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Organizations</h1>
          <p className="text-sm text-muted-foreground mb-6">Manage all organizations</p>

          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">
            {getBreadcrumb(activeTab)}
          </div>
        </div>

        <div className="pt-2">
          {activeTab === "overview" && (
            <OrganizationsOverviewTab
              organizations={organizations}
              loading={loading}
              error={error}
              role={role}
              onClearError={handleRetry}
            />
          )}
          {activeTab === "add" && (
            <AddOrganizationTab
              organizations={organizations}
              loading={loading}
              refetch={refetch}
              removeOrganizationById={removeOrganizationById}
              role={role}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Organizations;
