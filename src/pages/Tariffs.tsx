import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  fetchTariffByConnector,
  saveTariff,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption, TariffRow } from "@/types";

const tabs = [{ id: "add", label: "Tariffs" }];

const peakTypeOptions = [
  { value: "Peak", label: "Peak" },
  { value: "Off-Peak", label: "Off-Peak" },
  { value: "Shoulder", label: "Shoulder" },
];

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const Tariffs = () => {
  const [activeTab, setActiveTab] = useState("add");
  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);
  const [connectorOptions, setConnectorOptions] = useState<SelectOption[]>([]);

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedCharger, setSelectedCharger] = useState<string>("");
  const [selectedConnector, setSelectedConnector] = useState<string>("__NEW_TARIFF__");

  const [tariff, setTariff] = useState<TariffRow>({
    tariff_id: "",
    type: "",
    buy_rate: 0,
    sell_rate: 0,
    transaction_fees: 0,
    client_percentage: 0,
    partner_percentage: 0,
    peak_type: "",
    status: "",
  });

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingChargers, setLoadingChargers] = useState(false);
  const [loadingConnectors, setLoadingConnectors] = useState(false);
  const [loadingTariff, setLoadingTariff] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingOrgs(true);
        const opts = await fetchChargerOrganizations();
        setOrgOptions(opts);
        setSelectedOrg(opts[0]?.value ?? "");
      } catch (error) {
        toast({
          title: "Failed to load organizations",
          description: "Could not load organizations.",
          variant: "destructive",
        });
      } finally {
        setLoadingOrgs(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!selectedOrg) {
        setLocationOptions([]);
        setSelectedLocation("");
        return;
      }
      try {
        setLoadingLocations(true);
        const opts = await fetchLocationsByOrg(selectedOrg);
        setLocationOptions(opts);
        setSelectedLocation(opts[0]?.value ?? "");
      } catch (error) {
        toast({
          title: "Failed to load locations",
          description: "Could not load locations.",
          variant: "destructive",
        });
      } finally {
        setLoadingLocations(false);
      }
    };
    load();
  }, [selectedOrg]);

  useEffect(() => {
    const load = async () => {
      if (!selectedLocation) {
        setChargerOptions([]);
        setSelectedCharger("");
        return;
      }
      try {
        setLoadingChargers(true);
        const opts = await fetchChargersByLocation(selectedLocation);
        setChargerOptions(opts);
        setSelectedCharger(opts[0]?.value ?? "");
      } catch (error) {
        toast({
          title: "Failed to load chargers",
          description: "Could not load chargers.",
          variant: "destructive",
        });
      } finally {
        setLoadingChargers(false);
      }
    };
    load();
  }, [selectedLocation]);

  useEffect(() => {
    const load = async () => {
      if (!selectedCharger) {
        setConnectorOptions([]);
        setSelectedConnector("__NEW_TARIFF__");
        return;
      }
      try {
        setLoadingConnectors(true);
        const opts = await fetchConnectorsByCharger(selectedCharger);
        setConnectorOptions([{ value: "__NEW_TARIFF__", label: "➕ Add New Tariff" }, ...opts]);
        setSelectedConnector("__NEW_TARIFF__");
        resetTariff();
      } catch (error) {
        toast({
          title: "Failed to load connectors",
          description: "Could not load connectors.",
          variant: "destructive",
        });
      } finally {
        setLoadingConnectors(false);
      }
    };
    load();
  }, [selectedCharger]);

  const resetTariff = () =>
    setTariff({
      tariff_id: "",
      type: "",
      buy_rate: 0,
      sell_rate: 0,
      transaction_fees: 0,
      client_percentage: 0,
      partner_percentage: 0,
      peak_type: "",
      status: "",
    });

  const handleSelectConnector = async (value: string) => {
    setSelectedConnector(value);
    if (value === "__NEW_TARIFF__") {
      resetTariff();
      return;
    }
    try {
      setLoadingTariff(true);
      const data = await fetchTariffByConnector(value);
      if (data) {
        setTariff({
          tariff_id: data.tariff_id ?? "",
          type: data.type ?? "",
          buy_rate: Number(data.buy_rate ?? 0),
          sell_rate: Number(data.sell_rate ?? 0),
          transaction_fees: Number(data.transaction_fees ?? 0),
          client_percentage: Number(data.client_percentage ?? 0),
          partner_percentage: Number(data.partner_percentage ?? 0),
          peak_type: data.peak_type ?? "",
          status: data.status ?? "",
        });
      } else {
        resetTariff();
      }
    } catch (error) {
      toast({
        title: "Failed to load tariff",
        description: "Could not load tariff for the selected connector.",
        variant: "destructive",
      });
    } finally {
      setLoadingTariff(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnector || selectedConnector === "__NEW_TARIFF__") {
      toast({
        title: "Select a connector",
        description: "You must select a connector to save the tariff.",
        variant: "destructive",
      });
      return;
    }
    if (!tariff.type || !tariff.buy_rate || !tariff.sell_rate) {
      toast({
        title: "Required fields",
        description: "Type, buy rate, and sell rate are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const res = await saveTariff({
        tariffId: tariff.tariff_id,
        connectorId: selectedConnector,
        type: tariff.type,
        buyRate: Number(tariff.buy_rate),
        sellRate: Number(tariff.sell_rate),
        transactionFees: tariff.transaction_fees ? Number(tariff.transaction_fees) : undefined,
        clientPercentage: tariff.client_percentage ? Number(tariff.client_percentage) : undefined,
        partnerPercentage: tariff.partner_percentage ? Number(tariff.partner_percentage) : undefined,
        peakType: tariff.peak_type,
        status: tariff.status,
      });

      if (res.success) {
        toast({ title: "Saved", description: res.message });
      } else {
        toast({ title: "Not saved", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "Unexpected error",
        description: "Could not save the tariff.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const breadcrumb = useMemo(() => "ION Dashboard / Tariffs / Add Tariffs", []);

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
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <form className="space-y-6" onSubmit={handleSave}>
              {/* Row 1: Organization, Location, Charger, Connector */}
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
                  <Label>Connector ID</Label>
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
                  {loadingTariff && (
                    <p className="text-xs text-muted-foreground">Loading tariff details...</p>
                  )}
                </div>
              </div>

              {/* Row 2: Tariff ID and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tariff ID (Primary Key)</Label>
                  <Input
                    placeholder="Auto-generated or enter manually"
                    value={tariff.tariff_id ?? ""}
                    onChange={(e) => setTariff((t) => ({ ...t, tariff_id: e.target.value }))}
                    readOnly={!!tariff.tariff_id}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Type <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g., residential, commercial"
                    value={tariff.type ?? ""}
                    onChange={(e) => setTariff((t) => ({ ...t, type: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Row 3: Buy Rate and Sell Rate */}
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

              {/* Row 4: Transaction Fees, Client %, Partner %} */}
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

              {/* Row 5: Peak Type and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Peak Type</Label>
                  <Select
                    value={tariff.peak_type || ""}
                    onValueChange={(val) => setTariff((t) => ({ ...t, peak_type: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select peak type" />
                    </SelectTrigger>
                    <SelectContent>
                      {peakTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={tariff.status || ""}
                    onValueChange={(val) => setTariff((t) => ({ ...t, status: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={resetTariff} disabled={saving || loadingTariff}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || loadingTariff}>
                  {saving ? "Saving..." : "Add / Update Tariff"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tariffs;
