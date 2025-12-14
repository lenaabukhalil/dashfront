import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LocationsList } from "@/components/locations/LocationsList";
import { AddLocationForm } from "@/components/locations/AddLocationForm";

const Locations = () => {
  const [activeTab, setActiveTab] = useState<"list" | "add">("list");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold mb-1">Locations</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage all charging station locations
          </p>

          {/* Tabs */}
          <div className="flex gap-6 mb-4">
            <button
              onClick={() => setActiveTab("list")}
              className={`text-sm pb-2 border-b-2 transition-colors ${
                activeTab === "list"
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setActiveTab("add")}
              className={`text-sm pb-2 border-b-2 transition-colors ${
                activeTab === "add"
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Add location
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="text-xs text-muted-foreground pb-4 border-b border-border">
            ION Dashboard / Locations
            {activeTab === "add" && " / Add location"}
          </div>
        </div>

        {/* Content */}
        <div className="pt-2">
          {activeTab === "list" ? <LocationsList /> : <AddLocationForm />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Locations;
