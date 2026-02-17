import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityFormActions } from "@/components/shared/EntityFormActions";
import { useConnectorForm } from "../hooks/useConnectorForm";

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
}

export function ConnectorsTab({ activeTab, onConnectorSaved }: ConnectorsTabProps) {
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
  } = useConnectorForm(activeTab, onConnectorSaved);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
      <form className="space-y-6" onSubmit={handleSave}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select disabled={loadingOrgs} value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger>
                <SelectValue placeholder={loadingOrgs ? "Loading..." : "Select organization"} />
              </SelectTrigger>
              <SelectContent>
                {orgOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              disabled={!selectedOrg || loadingLocations}
              value={selectedLocation}
              onValueChange={setSelectedLocation}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingLocations ? "Loading..." : "Select location"} />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Charger</Label>
            <Select
              disabled={!selectedLocation || loadingChargers}
              value={selectedCharger}
              onValueChange={setSelectedCharger}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingChargers ? "Loading..." : "Select charger"} />
              </SelectTrigger>
              <SelectContent>
                {chargerOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Connector</Label>
            <Select
              disabled={!selectedCharger || loadingConnectors}
              value={selectedConnector}
              onValueChange={handleSelectConnector}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingConnectors ? "Loading..." : "Select connector"} />
              </SelectTrigger>
              <SelectContent>
                {connectorOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingDetails && (
              <p className="text-xs text-muted-foreground">Loading connector details...</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Connector Type *</Label>
            <Select
              value={formData.connector_type || ""}
              onValueChange={(val) => setFormData((p) => ({ ...p, connector_type: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {connectorTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status *</Label>
            <Select
              value={formData.status || "available"}
              onValueChange={(val) => setFormData((p) => ({ ...p, status: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {connectorStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              value={formData.power_unit ?? ""}
              onChange={(e) => setFormData((p) => ({ ...p, power_unit: e.target.value }))}
              placeholder="e.g. KWH, kW"
              maxLength={45}
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
              value={formData.ocpi_id ?? ""}
              onChange={(e) => setFormData((p) => ({ ...p, ocpi_id: e.target.value }))}
              placeholder="e.g. ocpi.1, ocpi.25"
              maxLength={45}
            />
          </div>

          <div className="space-y-2">
            <Label>OCPI Standard</Label>
            <Select
              value={formData.ocpi_standard || ""}
              onValueChange={(val) => setFormData((p) => ({ ...p, ocpi_standard: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ocpiStandardOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>OCPI Format</Label>
            <Select
              value={formData.ocpi_format || ""}
              onValueChange={(val) => setFormData((p) => ({ ...p, ocpi_format: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ocpiFormatOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>OCPI Power Type</Label>
            <Select
              value={formData.ocpi_power_type || ""}
              onValueChange={(val) => setFormData((p) => ({ ...p, ocpi_power_type: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ocpiPowerTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              checked={formData.available !== false}
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
