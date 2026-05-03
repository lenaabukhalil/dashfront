import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { useUsersOrgs } from "@/features/users/hooks/useUsersOrgs";
import { LeadershipTab } from "@/features/users/tabs/LeadershipTab";
import { PartnerUsersTab } from "@/features/users/tabs/PartnerUsersTab";
import { IonOrganizationUsersTab } from "@/features/users/tabs/IonOrganizationUsersTab";
import { RfidUsersTab } from "@/features/users/tabs/RfidUsersTab";

const allTabs = [
  { id: "leadership", label: "Leadership" },
  { id: "ionOrgUsers", label: "ION Organization Users" },
  { id: "partnerUsers", label: "Partner Users" },
  { id: "rfidUsers", label: "RFID Users" },
] as const;

function getBreadcrumb(activeTab: string) {
  switch (activeTab) {
    case "partnerUsers":
      return "ION Dashboard / Users / Partner Users";
    case "ionOrgUsers":
      return "ION Dashboard / Users / ION Organization Users";
    case "rfidUsers":
      return "ION Dashboard / Users / RFID Users";
    default:
      return "ION Dashboard / Users";
  }
}

const Users = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission();
  const [activeTab, setActiveTab] = useState("leadership");

  const { orgOptions, loadingOrg, initialOrgValue } = useUsersOrgs();

  const tabs = useMemo(() => {
    return allTabs.filter((t) => {
      if (t.id === "leadership") return true;
      if (t.id === "ionOrgUsers") return canRead("users.edit");
      if (t.id === "partnerUsers") return canRead("users.edit");
      if (t.id === "rfidUsers") return canRead("rfid.edit");
      return true;
    });
  }, [canRead]);

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? "leadership");
    }
  }, [tabs, activeTab]);

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
          {activeTab === "ionOrgUsers" && <IonOrganizationUsersTab role={role} />}
          {activeTab === "partnerUsers" && (
            <PartnerUsersTab
              role={role}
              orgOptions={orgOptions}
              loadingOrg={loadingOrg}
            />
          )}
          {activeTab === "rfidUsers" && (
            <RfidUsersTab role={role} orgOptions={orgOptions} loadingOrg={loadingOrg} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Users;
