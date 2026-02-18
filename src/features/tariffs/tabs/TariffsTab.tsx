import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/shared/AppSelect";
import { EntityFormActions } from "@/components/shared/EntityFormActions";
import { useTariffForm } from "../hooks/useTariffForm";

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
}

export function TariffsTab({ activeTab }: TariffsTabProps) {
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
    selectedTariff,
    tariffOptions,
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
    handleSelectTariff,
    handleSave,
    handleDeleteTariff,
  } = useTariffForm(activeTab);

  const filterOpt = (opts: { value: string; label: string }[]) =>
    opts.filter((opt) => String(opt.value).trim() !== "");

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <form className="p-6 space-y-6" onSubmit={handleSave}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Organization</Label>
            <AppSelect
              options={filterOpt(orgOptions)}
              value={selectedOrg}
              onChange={setSelectedOrg}
              placeholder={loadingOrgs ? "Loading..." : "Select organization"}
              isDisabled={loadingOrgs}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <AppSelect
              options={filterOpt(locationOptions)}
              value={selectedLocation}
              onChange={setSelectedLocation}
              placeholder={loadingLocations ? "Loading..." : "Select location"}
              isDisabled={!selectedOrg || loadingLocations}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Charger</Label>
            <AppSelect
              options={filterOpt(chargerOptions)}
              value={selectedCharger}
              onChange={setSelectedCharger}
              placeholder={loadingChargers ? "Loading..." : "Select charger"}
              isDisabled={!selectedLocation || loadingChargers}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Connector</Label>
            <AppSelect
              options={filterOpt(connectorOptions)}
              value={selectedConnector}
              onChange={handleSelectConnector}
              placeholder={loadingConnectors ? "Loading..." : "Select connector"}
              isDisabled={!selectedCharger || loadingConnectors}
              className="w-full"
            />
          </div>
        </div>

        {selectedConnector && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <Label className="text-base font-semibold">Tariff for this connector</Label>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 max-w-xs">
                <AppSelect
                  options={tariffOptions.map((opt) => ({
                    value: String(opt.value),
                    label: opt.value === "__NEW__" ? `+ ${opt.label}` : opt.label,
                  }))}
                  value={selectedTariff}
                  onChange={handleSelectTariff}
                  placeholder={loadingTariff ? "Loading..." : "Select or add tariff"}
                  isDisabled={loadingTariff}
                  className="w-full"
                />
              </div>
              {selectedTariff === "__NEW__" && (
                <p className="text-sm text-muted-foreground">Fill the form below and save to create a new tariff.</p>
              )}
            </div>
            {loadingTariff && <p className="text-xs text-muted-foreground">Loading tariff...</p>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type <span className="text-destructive">*</span></Label>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <EntityFormActions
          mode={tariff.tariff_id ? "edit" : "create"}
          entityLabel="tariff"
          hasExistingEntity={Boolean(tariff.tariff_id)}
          isSubmitting={saving}
          onDiscard={resetTariff}
          onDelete={tariff.tariff_id ? handleDeleteTariff : undefined}
        />
      </form>
    </div>
  );
}
