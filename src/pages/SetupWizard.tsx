import * as React from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { toast } from "@/hooks/use-toast";
import { useWizardState } from "@/hooks/useWizardState";
import { WizardProgress } from "@/components/setup-wizard/WizardProgress";
import { WizardComplete } from "@/components/setup-wizard/WizardComplete";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/features/organizations/hooks/useOrganizations";
import { AddOrganizationTab } from "@/features/organizations/tabs/AddOrganizationTab";
import { AddLocationForm } from "@/components/locations/AddLocationForm";
import { AddChargerTab } from "@/features/chargers/tabs/AddChargerTab";
import { ConnectorsTab } from "@/features/connectors/tabs/ConnectorsTab";
import { TariffsTab } from "@/features/tariffs/tabs/TariffsTab";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupWizard() {
  const navigate = useNavigate();
  const wizard = useWizardState();
  const { state } = wizard;
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);
  const { organizations, loading: orgsLoading, refetch, removeOrganizationById } = useOrganizations(canRead);
  const [selectedCharger, setSelectedCharger] = React.useState("__NEW_CHARGER__");

  const [summaryNames, setSummaryNames] = React.useState({
    organization: "—",
    location: "—",
    charger: "—",
    connector: "—",
    tariff: "—",
  });

  const completeStep = (step: number, next = true) => {
    wizard.markStepComplete(step);
    if (next && step < 5) wizard.advanceStep();
    toast({ title: `Step ${step} complete!`, description: "Moving to next step..." });
  };

  const summaryItems = useMemo(
    () => [
      { label: "Organization", value: `${summaryNames.organization} ${state.completedSteps.includes(1) ? "✓" : ""}` },
      { label: "Location", value: `${summaryNames.location} ${state.completedSteps.includes(2) ? "✓" : ""}` },
      { label: "Charger", value: `${summaryNames.charger} ${state.completedSteps.includes(3) ? "✓" : ""}` },
      { label: "Connector", value: `${summaryNames.connector} ${state.completedSteps.includes(4) ? "✓" : ""}` },
      { label: "Tariff", value: `${summaryNames.tariff} ${state.completedSteps.includes(5) ? "✓" : ""}` },
    ],
    [summaryNames, state.completedSteps]
  );

  const completedBanner = useMemo(() => {
    const items: Array<{ label: string; value: string; done: boolean }> = [
      { label: "Organization", value: summaryNames.organization, done: state.completedSteps.includes(1) },
      { label: "Location", value: summaryNames.location, done: state.completedSteps.includes(2) },
      { label: "Charger", value: summaryNames.charger, done: state.completedSteps.includes(3) },
      { label: "Connector", value: summaryNames.connector, done: state.completedSteps.includes(4) },
    ];
    return items.filter((x) => x.done);
  }, [summaryNames, state.completedSteps]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Setup Wizard</h1>
          <p className="text-sm text-muted-foreground">
            Complete setup in strict order: Organization → Location → Charger → Connector → Tariff
          </p>
        </div>

        <WizardProgress
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          onStepClick={wizard.goToStep}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            {wizard.allCompleted ? (
              <WizardComplete
                summary={summaryItems.map((s) => ({ label: s.label, value: s.value.replace(" ✓", "") }))}
                onGoDashboard={() => navigate("/dashboard")}
                onStartAnother={() => {
                  wizard.resetWizard();
                  setSelectedCharger("__NEW_CHARGER__");
                  setSummaryNames({
                    organization: "—",
                    location: "—",
                    charger: "—",
                    connector: "—",
                    tariff: "—",
                  });
                }}
              />
            ) : (
              <div className="space-y-4">
                {state.currentStep > 1 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Completed Context</CardTitle>
                      <CardDescription>Previously completed setup items</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {completedBanner.map((item) => (
                        <Badge key={item.label} variant="secondary">
                          ✓ {item.label}: {item.value}
                        </Badge>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {state.currentStep === 1 && (
                  <AddOrganizationTab
                    organizations={organizations}
                    loading={orgsLoading}
                    refetch={refetch}
                    removeOrganizationById={removeOrganizationById}
                    role={role}
                    wizardMode
                    onWizardSave={({ organizationId, organizationName }) => {
                      wizard.setEntityId("organizationId", organizationId);
                      setSummaryNames((p) => ({ ...p, organization: organizationName }));
                      completeStep(1);
                    }}
                  />
                )}

                {state.currentStep === 2 && (
                  <AddLocationForm
                    wizardMode
                    prefilledOrgId={state.organizationId ?? undefined}
                    onWizardBack={wizard.goBackStep}
                    onWizardSave={({ locationId, locationName }) => {
                      wizard.setEntityId("locationId", locationId);
                      setSummaryNames((p) => ({ ...p, location: locationName }));
                      completeStep(2);
                    }}
                  />
                )}

                {state.currentStep === 3 && (
                  <AddChargerTab
                    activeTab="add"
                    role={role}
                    canRead={canRead}
                    selectedCharger={selectedCharger}
                    setSelectedCharger={setSelectedCharger}
                    wizardMode
                    prefilledOrgId={state.organizationId ?? undefined}
                    prefilledLocationId={state.locationId ?? undefined}
                    onWizardBack={wizard.goBackStep}
                    onWizardSave={({ chargerId, chargerName }) => {
                      wizard.setEntityId("chargerId", chargerId);
                      setSummaryNames((p) => ({ ...p, charger: chargerName }));
                      completeStep(3);
                    }}
                  />
                )}

                {state.currentStep === 4 && (
                  <ConnectorsTab
                    activeTab="add"
                    wizardMode
                    prefilledOrgId={state.organizationId ?? undefined}
                    prefilledLocationId={state.locationId ?? undefined}
                    prefilledChargerId={state.chargerId ?? undefined}
                    onWizardBack={wizard.goBackStep}
                    onWizardSave={({ connectorId, connectorName }) => {
                      wizard.setEntityId("connectorId", connectorId);
                      setSummaryNames((p) => ({ ...p, connector: connectorName }));
                      completeStep(4);
                    }}
                  />
                )}

                {state.currentStep === 5 && (
                  <TariffsTab
                    activeTab="add"
                    wizardMode
                    prefilledOrgId={state.organizationId ?? undefined}
                    prefilledLocationId={state.locationId ?? undefined}
                    prefilledChargerId={state.chargerId ?? undefined}
                    prefilledConnectorId={state.connectorId ?? undefined}
                    onWizardBack={wizard.goBackStep}
                    onWizardSave={({ tariffId, tariffName }) => {
                      wizard.setEntityId("tariffId", tariffId || "saved");
                      setSummaryNames((p) => ({ ...p, tariff: tariffName }));
                      wizard.markStepComplete(5);
                      toast({ title: "Step 5 complete!", description: "Setup completed successfully." });
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Setup Summary</h3>
              <ul className="space-y-2 text-sm">
                {summaryItems.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
