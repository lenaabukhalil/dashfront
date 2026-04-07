import { DashboardLayout } from "@/components/DashboardLayout";
import { TariffsTab } from "@/features/tariffs/tabs/TariffsTab";

const Tariffs = () => {
  const breadcrumb = "ION Dashboard / Tariffs";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Tariffs</h1>
          <p className="text-sm text-muted-foreground mb-6">Configure pricing and tariffs</p>

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">{breadcrumb}</div>
        </div>

        <div className="pt-2">
          <TariffsTab activeTab="add" />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tariffs;
