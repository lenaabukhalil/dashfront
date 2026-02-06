import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { AddLocationForm } from "@/components/locations/AddLocationForm";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { LocationsList } from "@/components/locations/LocationsList";

const tabs = [
  { id: "list", label: "List" },
  { id: "manage", label: "Locations" },
];

const Locations = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead, canWrite } = usePermission(role);
  const [activeTab, setActiveTab] = useState("list");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Locations</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage charging station locations and operations
          </p>

          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">
            ION Dashboard / Locations
          </div>
        </div>

        <div className="pt-2">
          {activeTab === "list" && <LocationsList />}
          {activeTab === "manage" && <AddLocationForm />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Locations;
