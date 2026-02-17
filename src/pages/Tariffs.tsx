import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { TariffsTab } from "@/features/tariffs/tabs/TariffsTab";

const tabs = [{ id: "add", label: "Tariffs" }];

const Tariffs = () => {
  const [activeTab, setActiveTab] = useState("add");
  const breadcrumb = "ION Dashboard / Tariffs / Add Tariffs";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Tariffs</h1>
          <p className="text-sm text-muted-foreground mb-6">Configure pricing and tariffs</p>

          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">{breadcrumb}</div>
        </div>

        <div className="pt-2">
          {activeTab === "add" && <TariffsTab activeTab={activeTab} />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tariffs;
