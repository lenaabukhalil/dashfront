import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SETUP_WIZARD_STATE_KEY } from "@/components/SetupWizard";
import { AddLocationForm } from "@/components/locations/AddLocationForm";
import { LocationsList } from "@/components/locations/LocationsList";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "list", label: "List" },
  { id: "manage", label: "Add / Update Locations" },
];

const Locations = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("list");
  const [listRefreshKey, setListRefreshKey] = useState(0);

  useEffect(() => {
    const tab = (location.state as Record<string, string>)?.[SETUP_WIZARD_STATE_KEY];
    if (tab === "manage") setActiveTab("manage");
  }, [location.state]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Locations</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage charging station locations and operations
          </p>

          <div className="inline-flex flex-wrap rounded-full bg-muted/40 p-1 gap-0.5 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          {activeTab === "list" && <LocationsList refreshKey={listRefreshKey} />}
          {activeTab === "manage" && (
            <AddLocationForm onLocationSaved={() => setListRefreshKey((k) => k + 1)} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Locations;
