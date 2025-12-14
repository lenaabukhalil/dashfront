import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { DataTable } from "@/components/shared/DataTable";
import { FormPlaceholder } from "@/components/shared/FormPlaceholder";
import { fetchOfflineChargers, fetchOnlineChargers } from "@/services/api";
import type { Charger } from "@/types";

const tabs = [
  { id: "status", label: "Status" },
  { id: "add", label: "Add Charger" },
];

const columns = [
  { key: "name" as const, header: "Name" },
  { key: "id" as const, header: "ID" },
  { key: "time" as const, header: "Time" },
];

const Chargers = () => {
  const [activeTab, setActiveTab] = useState("status");
  const [offlineChargers, setOfflineChargers] = useState<Charger[]>([]);
  const [onlineChargers, setOnlineChargers] = useState<Charger[]>([]);

  useEffect(() => {
    fetchOfflineChargers().then(setOfflineChargers);
    fetchOnlineChargers().then(setOnlineChargers);
  }, []);

  const getBreadcrumb = () => {
    if (activeTab === "add") {
      return "ION Dashboard / Chargers / Add Charger";
    }
    return "ION Dashboard / Chargers";
  };

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
            {getBreadcrumb()}
          </div>
        </div>

        <div className="pt-2">
          {activeTab === "status" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Offline Chargers */}
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive"></span>
                  Offline Chargers
                </h3>
                <DataTable columns={columns} data={offlineChargers} searchPlaceholder="Search offline chargers" />
              </div>

              {/* Online Chargers */}
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  Online Chargers
                </h3>
                <DataTable columns={columns} data={onlineChargers} searchPlaceholder="Search online chargers" />
              </div>
            </div>
          )}
          {activeTab === "add" && (
            <FormPlaceholder 
              title="Add Charger" 
              description="Register a new charger to the system."
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chargers;
