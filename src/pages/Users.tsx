import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { useUsersOrgs } from "@/features/users/hooks/useUsersOrgs";
import { LeadershipTab } from "@/features/users/tabs/LeadershipTab";
import { PartnerUsersTab } from "@/features/users/tabs/PartnerUsersTab";

const tabs = [
  { id: "leadership", label: "Leadership" },
  { id: "partnerUsers", label: "Partner Users" },
];

function getBreadcrumb(activeTab: string) {
  switch (activeTab) {
    case "partnerUsers":
      return "ION Dashboard / Users / Partner Users";
    default:
      return "ION Dashboard / Users";
  }
}

const Users = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);
  const [activeTab, setActiveTab] = useState("leadership");

  const { orgOptions, loadingOrg, initialOrgValue } = useUsersOrgs();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Users</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage users and partners
          </p>

          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">
            {getBreadcrumb(activeTab)}
          </div>
        </div>

        <div className="pt-2">
          {activeTab === "leadership" && (
            <LeadershipTab role={role} canRead={canRead} />
          )}
          {activeTab === "partnerUsers" && (
            <PartnerUsersTab
              role={role}
              orgOptions={orgOptions}
              loadingOrg={loadingOrg}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Users;
