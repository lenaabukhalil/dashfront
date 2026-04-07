import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/shared/AppSelect";
import { EntityFormActions } from "@/components/shared/EntityFormActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useTariffForm } from "../hooks/useTariffForm";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const typeOptions = [
  { value: "energy", label: "Energy" },
  { value: "time", label: "Time" },
  { value: "fixed", label: "Fixed" },
];

const peakTypeOptions = [
  { value: "NA", label: "NA" },
  { value: "Peak-On_AC", label: "Peak On (AC)" },
  { value: "Peak-Off_AC", label: "Peak Off (AC)" },
  { value: "Partial-Peak_AC", label: "Partial Peak (AC)" },
  { value: "Partial-Peak-Night_AC", label: "Partial Peak Night (AC)" },
  { value: "Peak-On_DC", label: "Peak On (DC)" },
  { value: "Peak-Off_DC", label: "Peak Off (DC)" },
  { value: "Partial-Peak_DC", label: "Partial Peak (DC)" },
  { value: "Partial-Peak-Night_DC", label: "Partial Peak Night (DC)" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

interface TariffsTabProps {
  activeTab: string;
  wizardMode?: boolean;
  prefilledOrgId?: string;
  prefilledLocationId?: string;
  prefilledChargerId?: string;
  prefilledConnectorId?: string;
  onWizardBack?: () => void;
  onWizardSave?: (payload: { tariffId: string; tariffName: string }) => void;
}

function TariffStatusBadge({ status, hasTariff }: { status?: string; hasTariff: boolean }) {
  if (!hasTariff) {
    return (
      <Badge variant="secondary" className="font-medium">
        No tariff
      </Badge>
    );
  }
  const s = (status || "").toLowerCase();
  if (s === "active") {
    return (
      <Badge
        variant="secondary"
        className="border-transparent bg-emerald-600/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-medium"
      >
        Active
      </Badge>
    );
  }
  if (s === "inactive") {
    return (
      <Badge variant="secondary" className="font-medium text-muted-foreground">
        Inactive
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-medium capitalize">
      {status || "—"}
    </Badge>
  );
}

export function TariffsTab({
  activeTab,
  wizardMode = false,
  prefilledOrgId,
  prefilledLocationId,
  prefilledChargerId,
  prefilledConnectorId,
  onWizardBack,
  onWizardSave,
}: TariffsTabProps) {
  const {
    orgOptions,
    locationOptions,
    chargerOptions,
    connectorOptions,
    selectedOrg,
    setSelectedOrg,
    selectedLocation,
    setSelectedLocation,
    selectedCharger,
    setSelectedCharger,
    selectedConnector,
    tariff,
    setTariff,
    loadingOrgs,
    loadingLocations,
    loadingChargers,
    loadingConnectors,
    loadingTariff,
    saving,
    resetTariff,
    handleSelectConnector,
    handleSave,
    handleDeleteTariff,
    inlineFeedback,
    clearInlineFeedback,
  } = useTariffForm(
    activeTab,
    prefilledOrgId,
    prefilledLocationId,
    prefilledChargerId,
    prefilledConnectorId,
    onWizardSave
  );

  const filterOpt = (opts: { value: string; label: string }[]) =>
    opts.filter((opt) => String(opt.value).trim() !== "");

  const hasExistingTariff = Boolean(tariff.tariff_id && String(tariff.tariff_id).trim() !== "");
  const hasTariffData = hasExistingTariff || Boolean((tariff.type || "").trim() !== "");
  const currentTariffLabel = hasTariffData
    ? `${tariff.type || "Tariff"} (${tariff.status === "inactive" ? "inactive" : tariff.status || "active"})`
    : null;

  const formFieldsSkeleton = (
    <div className="space-y-4" aria-busy="true" aria-label="Loading tariff fields">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="max-w-md">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );

  return (
    <form className="space-y-6" onSubmit={handleSave}>
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Select Connector</CardTitle>
          <CardDescription>Choose organization, location, charger, and connector to manage pricing.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="space-y-2">
              <Label>Organization</Label>
              {wizardMode && prefilledOrgId ? (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {filterOpt(orgOptions).find((o) => o.value === selectedOrg)?.label ?? selectedOrg}
                </div>
              ) : (
                <AppSelect
                  options={filterOpt(orgOptions)}
                  value={selectedOrg}
                  onChange={(v) => {
                    clearInlineFeedback();
                    setSelectedOrg(v);
                  }}
                  placeholder={loadingOrgs ? "Loading..." : "Select organization"}
                  isDisabled={loadingOrgs}
                  className="w-full"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              {wizardMode && prefilledLocationId ? (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {filterOpt(locationOptions).find((o) => o.value === selectedLocation)?.label ?? selectedLocation}
                </div>
              ) : (
                <AppSelect
                  options={filterOpt(locationOptions)}
                  value={selectedLocation}
                  onChange={(v) => {
                    clearInlineFeedback();
                    setSelectedLocation(v);
                  }}
                  placeholder={loadingLocations ? "Loading..." : "Select location"}
                  isDisabled={!selectedOrg || loadingLocations}
                  className="w-full"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Charger</Label>
              {wizardMode && prefilledChargerId ? (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {filterOpt(chargerOptions).find((o) => o.value === selectedCharger)?.label ?? selectedCharger}
                </div>
              ) : (
                <AppSelect
                  options={filterOpt(chargerOptions)}
                  value={selectedCharger}
                  onChange={(v) => {
                    clearInlineFeedback();
                    setSelectedCharger(v);
                  }}
                  placeholder={loadingChargers ? "Loading..." : "Select charger"}
                  isDisabled={!selectedLocation || loadingChargers}
                  className="w-full"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Connector</Label>
              {wizardMode && prefilledConnectorId ? (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {filterOpt(connectorOptions).find((o) => o.value === selectedConnector)?.label ?? selectedConnector}
                </div>
              ) : (
                <AppSelect
                  options={filterOpt(connectorOptions)}
                  value={selectedConnector}
                  onChange={(v) => {
                    clearInlineFeedback();
                    handleSelectConnector(v);
                  }}
                  placeholder={loadingConnectors ? "Loading..." : "Select connector"}
                  isDisabled={!selectedCharger || loadingConnectors}
                  className="w-full"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedConnector ? (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Tariff Configuration</CardTitle>
            <CardDescription>Edit rates and fees for the selected connector.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Current tariff for this connector
              </p>
              {loadingTariff ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-foreground">
                    {currentTariffLabel ?? "No tariff configured yet — fill the form and save."}
                  </p>
                  <TariffStatusBadge status={tariff.status} hasTariff={hasTariffData} />
                </div>
              )}
            </div>

            {loadingTariff ? (
              formFieldsSkeleton
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Type <span className="text-destructive">*</span>
                    </Label>
                    <AppSelect
                      options={typeOptions}
                      value={tariff.type || ""}
                      onChange={(val) => setTariff((t) => ({ ...t, type: val }))}
                      placeholder="Select type (energy / time / fixed)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <AppSelect
                      options={statusOptions}
                      value={tariff.status || "active"}
                      onChange={(val) => setTariff((t) => ({ ...t, status: val }))}
                      placeholder="Status"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Buy Rate ($/kWh) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      max="100"
                      value={tariff.buy_rate ?? ""}
                      onChange={(e) => setTariff((t) => ({ ...t, buy_rate: Number(e.target.value || 0) }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Sell Rate ($/kWh) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      max="100"
                      value={tariff.sell_rate ?? ""}
                      onChange={(e) => setTariff((t) => ({ ...t, sell_rate: Number(e.target.value || 0) }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Transaction Fees ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      max="100"
                      value={tariff.transaction_fees ?? ""}
                      onChange={(e) =>
                        setTariff((t) => ({
                          ...t,
                          transaction_fees: e.target.value ? Number(e.target.value) : 0,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Percentage (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="100"
                      value={tariff.client_percentage ?? ""}
                      onChange={(e) =>
                        setTariff((t) => ({
                          ...t,
                          client_percentage: e.target.value ? Number(e.target.value) : 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Partner Percentage (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="100"
                      value={tariff.partner_percentage ?? ""}
                      onChange={(e) =>
                        setTariff((t) => ({
                          ...t,
                          partner_percentage: e.target.value ? Number(e.target.value) : 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Peak Type</Label>
                    <AppSelect
                      options={peakTypeOptions}
                      value={tariff.peak_type || ""}
                      onChange={(val) => setTariff((t) => ({ ...t, peak_type: val }))}
                      placeholder="Select peak type (or NA)"
                    />
                  </div>
                </div>
              </>
            )}

            {wizardMode ? (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <button
                  type="button"
                  className="inline-flex h-10 items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium"
                  onClick={onWizardBack}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  disabled={saving || loadingTariff}
                >
                  {saving ? "Saving..." : "Save & Continue"}
                </button>
              </div>
            ) : (
              <EntityFormActions
                mode={tariff.tariff_id ? "edit" : "create"}
                entityLabel="tariff"
                hasExistingEntity={Boolean(tariff.tariff_id)}
                isSubmitting={saving || loadingTariff}
                disableSaveWhenInvalid={loadingTariff}
                onDiscard={resetTariff}
                onDelete={tariff.tariff_id ? handleDeleteTariff : undefined}
              />
            )}

            {inlineFeedback && (
              <Alert
                variant={inlineFeedback.variant === "destructive" ? "destructive" : "default"}
                className={cn(
                  inlineFeedback.variant === "default" &&
                    "border-emerald-500/40 bg-emerald-50/80 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100 dark:border-emerald-500/30"
                )}
              >
                {inlineFeedback.variant === "destructive" ? (
                  <AlertCircle className="h-4 w-4" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                )}
                <AlertTitle>{inlineFeedback.title}</AlertTitle>
                {inlineFeedback.description ? (
                  <AlertDescription>{inlineFeedback.description}</AlertDescription>
                ) : null}
                <button
                  type="button"
                  onClick={clearInlineFeedback}
                  className="mt-2 text-xs font-medium underline underline-offset-2 opacity-90 hover:opacity-100"
                >
                  Dismiss
                </button>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : null}
    </form>
  );
}
