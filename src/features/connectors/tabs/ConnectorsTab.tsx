import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppSelect } from "@/components/shared/AppSelect";
import { EntityFormActions } from "@/components/shared/EntityFormActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConnectorForm } from "../hooks/useConnectorForm";
import { fetchConnectorsByCharger, saveConnector, type ConnectorDetail } from "@/services/api";
import type { SelectOption } from "@/types";
import { toast } from "@/hooks/use-toast";

function getConnectorImage(standard: string): string {
  const u = standard.trim().toUpperCase().replace(/\s+/g, " ");
  if (u.includes("CCS2") || u.includes("CCS 2")) return "/ccs2.png";
  if (u.includes("CCS1") || u.includes("CCS 1") || (u.includes("CCS") && u.includes("1") && !u.includes("2")))
    return "/ccs1.png";
  if (u.includes("CHADEMO")) return "/CHAdeMO.png";
  if (u.includes("GBT") && u.includes("AC")) return "/GBT_AC.png";
  if (u.includes("GBT") && u.includes("DC")) return "/GBT_DC.png";
  if (u.includes("TYPE 2") || u === "TYPE2") return "/type2.png";
  if (u.includes("TYPE 1") || u === "TYPE1") return "/type1.png";
  return "/placeholder.svg";
}

const connectorTypeOptions = [
  "Type 1",
  "Type 2",
  "GBT AC",
  "GBT DC",
  "CHAdeMO",
  "CCS1",
  "CCS2",
].map((v) => ({ label: v, value: v }));

const ocpiStandardOptions = [
  "IEC_62196_T1",
  "IEC_62196_T1_COMBO",
  "IEC_62196_T2",
  "IEC_62196_T2_COMBO",
  "CHAdeMO",
  "TESLA_PROPRIETARY",
  "GBT_AC",
  "GBT_DC",
  "CEE_7_7",
  "NEMA_5_20",
  "OTHER",
].map((v) => ({ label: v, value: v }));

const ocpiFormatOptions = [
  { label: "CABLE", value: "CABLE" },
  { label: "SOCKET", value: "SOCKET" },
];

const ocpiPowerTypeOptions = [
  { label: "AC_1_PHASE", value: "AC_1_PHASE" },
  { label: "AC_3_PHASE", value: "AC_3_PHASE" },
  { label: "DC", value: "DC" },
];

const connectorStatusOptions = [
  "available",
  "preparing",
  "unavailable",
  "busy",
  "booked",
  "error",
].map((v) => ({ label: v, value: v }));

interface ConnectorsTabProps {
  activeTab: string;
  onConnectorSaved?: () => void;
  wizardMode?: boolean;
  prefilledOrgId?: string;
  prefilledLocationId?: string;
  prefilledChargerId?: string;
  onWizardBack?: () => void;
  onWizardSave?: (payload: { connectorId: string; connectorName: string }) => void;
}

export function ConnectorsTab({
  activeTab,
  onConnectorSaved,
  wizardMode = false,
  prefilledOrgId,
  prefilledLocationId,
  prefilledChargerId,
  onWizardBack,
  onWizardSave,
}: ConnectorsTabProps) {
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
    setSelectedConnector,
    formData,
    setFormData,
    loadingOrgs,
    loadingLocations,
    loadingChargers,
    loadingConnectors,
    loadingDetails,
    saving,
    resetForm,
    handleSelectConnector,
    handleSave,
    handleDeleteConnector,
  } = useConnectorForm(
    activeTab,
    onConnectorSaved,
    prefilledOrgId,
    prefilledLocationId,
    prefilledChargerId,
    onWizardSave
  );

  const [wizardSubMode, setWizardSubMode] = useState<"existing" | "new">("existing");
  const [existingConnectorsList, setExistingConnectorsList] = useState<SelectOption[]>([]);
  const [existingConnectorsLoading, setExistingConnectorsLoading] = useState(false);
  const [connectorDrafts, setConnectorDrafts] = useState<ConnectorDetail[]>([]);
  const [wizardBatchSaving, setWizardBatchSaving] = useState(false);

  useEffect(() => {
    if (wizardMode) setWizardSubMode("existing");
  }, [wizardMode, prefilledChargerId]);

  useEffect(() => {
    if (!wizardMode || !prefilledChargerId) {
      setExistingConnectorsList([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setExistingConnectorsLoading(true);
      try {
        const list = await fetchConnectorsByCharger(prefilledChargerId);
        if (!cancelled) setExistingConnectorsList(list);
      } catch {
        if (!cancelled) setExistingConnectorsList([]);
      } finally {
        if (!cancelled) setExistingConnectorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wizardMode, prefilledChargerId]);

  const statusDisplay = (s: string) =>
    connectorStatusOptions.find((o) => o.value === s)?.label || s || "—";

  const effectiveChargerId = prefilledChargerId || selectedCharger;

  const addConnectorDraft = () => {
    if (!effectiveChargerId) {
      toast({
        title: "Select a charger",
        description: "Please select a charger first.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.connector_type) {
      toast({
        title: "Connector type is required",
        description: "Please select a connector type.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.power || String(formData.power).trim() === "") {
      toast({
        title: "Power is required",
        description: "Please enter power (e.g. 7.2).",
        variant: "destructive",
      });
      return;
    }
    if (!formData.status || String(formData.status).trim() === "") {
      toast({
        title: "Status is required",
        description: "Please select a status.",
        variant: "destructive",
      });
      return;
    }
    setConnectorDrafts((prev) => [...prev, { ...formData }]);
    resetForm();
  };

  const saveAllConnectorDrafts = async () => {
    if (!onWizardSave) return;
    if (!effectiveChargerId) {
      toast({
        title: "Select a charger",
        description: "Charger is required to save connectors.",
        variant: "destructive",
      });
      return;
    }
    const formHasData = Boolean(formData.connector_type?.trim());
    if (formHasData) {
      if (!formData.power || String(formData.power).trim() === "") {
        toast({
          title: "Power is required",
          description: "Please enter power (e.g. 7.2).",
          variant: "destructive",
        });
        return;
      }
      if (!formData.status || String(formData.status).trim() === "") {
        toast({
          title: "Status is required",
          description: "Please select a status.",
          variant: "destructive",
        });
        return;
      }
    }
    const queue = formHasData ? [...connectorDrafts, { ...formData }] : [...connectorDrafts];
    if (queue.length === 0) {
      toast({
        title: "No drafted connectors",
        description: "Add at least one connector to the draft list, or use the Existing Connectors tab.",
        variant: "destructive",
      });
      return;
    }
    setWizardBatchSaving(true);
    try {
      let lastId = "";
      let lastName = "";
      for (const draft of queue) {
        const res = await saveConnector({
          chargerId: effectiveChargerId,
          connectorType: draft.connector_type || "",
          status: draft.status || "available",
          power: draft.power,
          powerUnit: "kW",
          timeLimit: draft.time_limit,
          pin: draft.pin,
          ocpiStandard: draft.ocpi_standard,
          ocpiFormat: draft.ocpi_format,
          ocpiPowerType: draft.ocpi_power_type,
          ocpiMaxVoltage: draft.ocpi_max_voltage,
          ocpiMaxAmperage: draft.ocpi_max_amperage,
          ocpiTariffIds: draft.ocpi_tariff_ids,
          stopOn80: !!draft.stop_on80,
          enabled: draft.enabled !== false,
        });
        if (!res.success) {
          toast({ title: "Not saved", description: res.message, variant: "destructive" });
          return;
        }
        const opts = await fetchConnectorsByCharger(effectiveChargerId);
        const resolved =
          res.connectorId ||
          opts.find(
            (o) => o.label.trim().toLowerCase() === draft.connector_type?.trim().toLowerCase()
          )?.value ||
          opts[opts.length - 1]?.value;
        if (!resolved) {
          toast({
            title: "Error",
            description: "Connector saved but could not resolve connector ID.",
            variant: "destructive",
          });
          return;
        }
        lastId = resolved;
        lastName = draft.connector_type?.trim() || "Connector";
      }
      setConnectorDrafts([]);
      if (formHasData) resetForm();
      onWizardSave({ connectorId: lastId, connectorName: lastName });
    } catch (e) {
      console.error(e);
      toast({
        title: "Unexpected error",
        description: "Could not save connectors.",
        variant: "destructive",
      });
    } finally {
      setWizardBatchSaving(false);
    }
  };

  const hideConnectorSelect = wizardMode && wizardSubMode === "new";

  const connectorFormFields = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Organization</Label>
          {wizardMode && prefilledOrgId ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {orgOptions.find((o) => o.value === selectedOrg)?.label ?? selectedOrg}
            </div>
          ) : (
            <AppSelect
              options={orgOptions}
              value={selectedOrg}
              onChange={setSelectedOrg}
              placeholder={loadingOrgs ? "Loading..." : "Select organization"}
              isDisabled={loadingOrgs}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          {wizardMode && prefilledLocationId ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {locationOptions.find((o) => o.value === selectedLocation)?.label ?? selectedLocation}
            </div>
          ) : (
            <AppSelect
              options={locationOptions}
              value={selectedLocation}
              onChange={setSelectedLocation}
              placeholder={loadingLocations ? "Loading..." : "Select location"}
              isDisabled={!selectedOrg || loadingLocations}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Charger</Label>
          {wizardMode && prefilledChargerId ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {chargerOptions.find((o) => o.value === selectedCharger)?.label ?? selectedCharger}
            </div>
          ) : (
            <AppSelect
              options={chargerOptions}
              value={selectedCharger}
              onChange={setSelectedCharger}
              placeholder={loadingChargers ? "Loading..." : "Select charger"}
              isDisabled={!selectedLocation || loadingChargers}
            />
          )}
        </div>

        {!hideConnectorSelect ? (
          <div className="space-y-2">
            <Label>Connector</Label>
            <AppSelect
              options={connectorOptions}
              value={selectedConnector}
              onChange={handleSelectConnector}
              placeholder={loadingConnectors ? "Loading..." : "Select connector"}
              isDisabled={!selectedCharger || loadingConnectors}
            />
            {loadingDetails && (
              <p className="text-xs text-muted-foreground">Loading connector details...</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Connector Type *</Label>
            <AppSelect
              options={connectorTypeOptions}
              value={formData.connector_type || ""}
              onChange={(val) => setFormData((p) => ({ ...p, connector_type: val }))}
              placeholder="Select type"
              formatOptionLabel={(option) => (
                <div className="flex w-full items-center gap-2">
                  <img
                    src={getConnectorImage(option.label)}
                    alt={option.label}
                    style={{ width: 22, height: 22 }}
                    className="object-contain shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                  <span className="truncate">{option.label}</span>
                </div>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Status *</Label>
            <AppSelect
              options={connectorStatusOptions}
              value={formData.status || "available"}
              onChange={(val) => setFormData((p) => ({ ...p, status: val }))}
              placeholder="Status"
            />
          </div>

          <div className="space-y-2">
            <Label>Power *</Label>
            <Input
              value={formData.power ?? ""}
              onChange={(e) => setFormData((p) => ({ ...p, power: e.target.value }))}
              placeholder="e.g. 22, 60, 120, 180, 240"
              maxLength={45}
            />
          </div>

          <div className="space-y-2">
            <Label>Power Unit</Label>
            <Input
              value="kW"
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label>Time Limit (min)</Label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 60, 90, 300"
              value={formData.time_limit ?? ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  time_limit: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>PIN</Label>
            <Input
              value={formData.pin ?? ""}
              onChange={(e) => setFormData((p) => ({ ...p, pin: e.target.value }))}
              placeholder="optional"
              maxLength={45}
            />
          </div>

          <div className="space-y-2">
            <Label>OCPI ID</Label>
            <Input
              value={(formData as { ocpi_id?: string }).ocpi_id ?? ""}
              onChange={(e) => setFormData((p) => ({ ...p, ocpi_id: e.target.value }))}
              placeholder="e.g. ocpi.1, ocpi.25"
              maxLength={45}
            />
          </div>

          <div className="space-y-2">
            <Label>OCPI Standard</Label>
            <AppSelect
              options={ocpiStandardOptions}
              value={formData.ocpi_standard || ""}
              onChange={(val) => setFormData((p) => ({ ...p, ocpi_standard: val }))}
              placeholder="OCPI Standard"
            />
          </div>

          <div className="space-y-2">
            <Label>OCPI Format</Label>
            <AppSelect
              options={ocpiFormatOptions}
              value={formData.ocpi_format || ""}
              onChange={(val) => setFormData((p) => ({ ...p, ocpi_format: val }))}
              placeholder="OCPI Format"
            />
          </div>

          <div className="space-y-2">
            <Label>OCPI Power Type</Label>
            <AppSelect
              options={ocpiPowerTypeOptions}
              value={formData.ocpi_power_type || ""}
              onChange={(val) => setFormData((p) => ({ ...p, ocpi_power_type: val }))}
              placeholder="OCPI Power Type"
            />
          </div>

          <div className="space-y-2">
            <Label>OCPI Max Voltage</Label>
            <Input
              value={formData.ocpi_max_voltage ?? ""}
              onChange={(e) => setFormData((p) => ({ ...p, ocpi_max_voltage: e.target.value }))}
              placeholder="e.g. 240, 1000"
              maxLength={45}
            />
          </div>

          <div className="space-y-2">
            <Label>OCPI Max Amperage</Label>
            <Input
              value={formData.ocpi_max_amperage ?? ""}
              onChange={(e) => setFormData((p) => ({ ...p, ocpi_max_amperage: e.target.value }))}
              placeholder="e.g. 30, 250, 300"
              maxLength={45}
            />
          </div>

          <div className="space-y-2">
            <Label>OCPI Tariff Ids</Label>
            <Input
              value={formData.ocpi_tariff_ids ?? ""}
              onChange={(e) => setFormData((p) => ({ ...p, ocpi_tariff_ids: e.target.value }))}
              placeholder="optional"
              maxLength={45}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div>
              <Label className="text-base">Stop Charging at 80%</Label>
              <p className="text-sm text-muted-foreground">
                Automatically stop when battery reaches 80%
              </p>
            </div>
            <Switch
              checked={!!formData.stop_on80}
              onCheckedChange={(checked) => setFormData((p) => ({ ...p, stop_on80: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div>
              <Label className="text-base">Available</Label>
              <p className="text-sm text-muted-foreground">
                Connector is available for sessions
              </p>
            </div>
            <Switch
              checked={(formData as { available?: boolean }).available !== false}
              onCheckedChange={(checked) => setFormData((p) => ({ ...p, available: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div>
              <Label className="text-base">Enable Connector</Label>
              <p className="text-sm text-muted-foreground">
                Toggle connector enabled state
              </p>
            </div>
            <Switch
              checked={formData.enabled !== false}
              onCheckedChange={(checked) => setFormData((p) => ({ ...p, enabled: checked }))}
            />
          </div>
        </div>
    </>
  );

  if (wizardMode) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connectors</CardTitle>
          <CardDescription>
            Review existing connectors or add a new connector for this charger.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="inline-flex rounded-lg border border-border bg-muted/20 p-1">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                wizardSubMode === "existing"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setWizardSubMode("existing");
                setConnectorDrafts([]);
              }}
            >
              Existing Connectors
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                wizardSubMode === "new"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setWizardSubMode("new");
                setConnectorDrafts([]);
                resetForm();
                setSelectedConnector("__NEW_CONNECTOR__");
              }}
            >
              Add New Connector
            </button>
          </div>

          {wizardSubMode === "existing" ? (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Existing Connectors on This Charger</h4>
                {!prefilledChargerId ? (
                  <p className="text-sm text-muted-foreground">Complete the charger step first.</p>
                ) : existingConnectorsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading existing connectors...</p>
                ) : existingConnectorsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No existing connectors found.</p>
                ) : (
                  existingConnectorsList.map((conn) => (
                    <button
                      key={conn.value}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/30"
                      onClick={() =>
                        void onWizardSave?.({
                          connectorId: conn.value,
                          connectorName: conn.label,
                        })
                      }
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{conn.label}</div>
                        <div className="text-xs text-muted-foreground truncate">ID: {conn.value}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">Connector</Badge>
                        <Badge variant="outline" className="tabular-nums">
                          {conn.value}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <Button variant="outline" type="button" onClick={onWizardBack}>
                  Back
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {connectorFormFields}
              <p className="text-sm text-muted-foreground mb-2">
                Add another connector, or click <strong>Save & Continue</strong> to proceed.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={addConnectorDraft}
                  disabled={
                    wizardBatchSaving ||
                    saving ||
                    loadingOrgs ||
                    loadingLocations ||
                    loadingChargers ||
                    !effectiveChargerId
                  }
                >
                  Add New Connector
                </Button>
              </div>
              {connectorDrafts.length > 0 ? (
                <div className="space-y-2">
                  {connectorDrafts.map((d, idx) => (
                    <div
                      key={`${d.connector_type}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {d.connector_type?.trim() || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {d.power ?? "—"}
                          {" kW"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {d.enabled === false ? "Disabled" : "Enabled"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">{statusDisplay(d.status || "available")}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No drafted connectors yet.</p>
              )}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <Button variant="outline" type="button" onClick={onWizardBack} disabled={wizardBatchSaving}>
                  Back
                </Button>
                <Button type="button" disabled={wizardBatchSaving} onClick={() => void saveAllConnectorDrafts()}>
                  {wizardBatchSaving ? "Saving..." : "Save & Continue"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
      <form className="space-y-6" onSubmit={handleSave}>
        {connectorFormFields}
        <EntityFormActions
          mode={selectedConnector === "__NEW_CONNECTOR__" ? "create" : "edit"}
          entityLabel="connector"
          hasExistingEntity={selectedConnector !== "__NEW_CONNECTOR__"}
          isSubmitting={saving}
          onDiscard={resetForm}
          onDelete={selectedConnector !== "__NEW_CONNECTOR__" ? handleDeleteConnector : undefined}
        />
      </form>
    </div>
  );
}
