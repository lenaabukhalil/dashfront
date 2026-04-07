import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/features/organizations/hooks/useOrganizations";
import { AddOrganizationTab } from "@/features/organizations/tabs/AddOrganizationTab";
import { AddLocationForm } from "@/components/locations/AddLocationForm";
import { AddChargerTab } from "@/features/chargers/tabs/AddChargerTab";
import { ConnectorsTab } from "@/features/connectors/tabs/ConnectorsTab";
import { TariffsTab } from "@/features/tariffs/tabs/TariffsTab";
import {
  Building2,
  MapPin,
  Zap,
  Plug,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const STEPS = [
  { id: "org", label: "Organization", short: "Org", icon: Building2 },
  { id: "location", label: "Location", short: "Location", icon: MapPin },
  { id: "charger", label: "Charger", short: "Charger", icon: Zap },
  { id: "connector", label: "Connector", short: "Connector", icon: Plug },
  { id: "tariff", label: "Tariff", short: "Tariff", icon: DollarSign },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const SetupWizardPage = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);
  const [step, setStep] = useState<StepId>("org");

  const { organizations, loading: orgsLoading, refetch, removeOrganizationById } = useOrganizations(canRead);
  const [chargerSelection, setChargerSelection] = useState("__NEW_CHARGER__");
  const [locationRefreshKey, setLocationRefreshKey] = useState(0);
  const [chargerRefreshKey, setChargerRefreshKey] = useState(0);
  const [connectorRefreshKey, setConnectorRefreshKey] = useState(0);

  const currentIndex = STEPS.findIndex((s) => s.id === step);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < STEPS.length - 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Setup Wizard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete setup in order: Organization → Location → Charger → Connector → Tariff
          </p>
        </div>

        {/* Stepper */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isPast = STEPS.findIndex((x) => x.id === step) > i;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive && "bg-primary text-primary-foreground shadow-sm",
                  !isActive && isPast && "bg-muted/60 text-muted-foreground hover:bg-muted",
                  !isActive && !isPast && "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.short}</span>
                <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-xs dark:bg-white/10">
                  {i + 1}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[320px] rounded-xl border border-border bg-muted/10">
          {step === "org" && (
            <AddOrganizationTab
              organizations={organizations}
              loading={orgsLoading}
              refetch={refetch}
              removeOrganizationById={removeOrganizationById}
              role={role}
            />
          )}
          {step === "location" && (
            <div key={locationRefreshKey} className="p-4 sm:p-6">
              <AddLocationForm onLocationSaved={() => setLocationRefreshKey((k) => k + 1)} />
            </div>
          )}
          {step === "charger" && (
            <div key={chargerRefreshKey} className="p-4 sm:p-6">
              <AddChargerTab
                activeTab="add"
                role={role}
                canRead={canRead}
                selectedCharger={chargerSelection}
                setSelectedCharger={setChargerSelection}
                onChargerSaved={() => setChargerRefreshKey((k) => k + 1)}
              />
            </div>
          )}
          {step === "connector" && (
            <div key={connectorRefreshKey} className="p-4 sm:p-6">
              <ConnectorsTab activeTab="add" onConnectorSaved={() => setConnectorRefreshKey((k) => k + 1)} />
            </div>
          )}
          {step === "tariff" && (
            <div className="p-4 sm:p-6">
              <TariffsTab activeTab="add" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(STEPS[currentIndex - 1].id)}
            disabled={!canPrev}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Step {currentIndex + 1} of {STEPS.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(STEPS[currentIndex + 1].id)}
            disabled={!canNext}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SetupWizardPage;
