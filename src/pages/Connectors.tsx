import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
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
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  fetchConnectorDetails,
  saveConnector,
  type ConnectorDetail,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption } from "@/types";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "add", label: "Add Connector" },
];

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

const powerUnitOptions = [
  { label: "kW", value: "kW" },
  { label: "W", value: "W" },
  { label: "HP", value: "HP" },
];

const Connectors = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);
  const [connectorOptions, setConnectorOptions] = useState<SelectOption[]>([]);

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedCharger, setSelectedCharger] = useState<string>("");
  const [selectedConnector, setSelectedConnector] = useState<string>("__NEW_CONNECTOR__");

  const [formData, setFormData] = useState<ConnectorDetail>({
    connector_type: "",
    status: "",
    power: "",
    power_unit: "",
    time_limit: undefined,
    pin: "",
    ocpi_standard: "",
    ocpi_format: "",
    ocpi_power_type: "",
    ocpi_max_voltage: "",
    ocpi_max_amperage: "",
    ocpi_tariff_ids: "",
    stop_on80: false,
    enabled: true,
  });

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingChargers, setLoadingChargers] = useState(false);
  const [loadingConnectors, setLoadingConnectors] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingOrgs(true);
        const opts = await fetchChargerOrganizations();
        setOrgOptions(opts);
        if (opts.length) setSelectedOrg(opts[0].value);
      } catch (error) {
        toast({
          title: "خطأ تحميل المنظمات",
          description: "تعذر تحميل قائمة المنظمات.",
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
          title: "خطأ تحميل المواقع",
          description: "تعذر تحميل المواقع.",
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
          title: "خطأ تحميل الشواحن",
          description: "تعذر تحميل الشواحن لهذا الموقع.",
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
        setSelectedConnector("__NEW_CONNECTOR__");
        return;
      }
      try {
        setLoadingConnectors(true);
        const opts = await fetchConnectorsByCharger(selectedCharger);
        setConnectorOptions([{ value: "__NEW_CONNECTOR__", label: "--- New Connector ---" }, ...opts]);
        setSelectedConnector("__NEW_CONNECTOR__");
        resetForm();
      } catch (error) {
        toast({
          title: "خطأ تحميل الموصلات",
          description: "تعذر تحميل الموصلات لهذا الشاحن.",
          variant: "destructive",
        });
      } finally {
        setLoadingConnectors(false);
      }
    };
    load();
  }, [selectedCharger]);

  const resetForm = () => {
    setFormData({
      connector_type: "",
      status: "",
      power: "",
      power_unit: "",
      time_limit: undefined,
      pin: "",
      ocpi_standard: "",
      ocpi_format: "",
      ocpi_power_type: "",
      ocpi_max_voltage: "",
      ocpi_max_amperage: "",
      ocpi_tariff_ids: "",
      stop_on80: false,
      enabled: true,
    });
    setSelectedConnector("__NEW_CONNECTOR__");
  };

  const handleSelectConnector = async (value: string) => {
    setSelectedConnector(value);
    if (value === "__NEW_CONNECTOR__") {
      resetForm();
      return;
    }

    try {
      setLoadingDetails(true);
      const details = await fetchConnectorDetails(value);
      if (details) {
        setFormData({
          connector_type: details.connector_type ?? "",
          status: details.status ?? "",
          power: details.power ?? "",
          power_unit: details.power_unit ?? "",
          time_limit: details.time_limit,
          pin: details.pin ?? "",
          ocpi_standard: details.ocpi_standard ?? "",
          ocpi_format: details.ocpi_format ?? "",
          ocpi_power_type: details.ocpi_power_type ?? "",
          ocpi_max_voltage: details.ocpi_max_voltage ?? "",
          ocpi_max_amperage: details.ocpi_max_amperage ?? "",
          ocpi_tariff_ids: details.ocpi_tariff_ids ?? "",
          stop_on80: !!details.stop_on80,
          enabled: details.enabled !== undefined ? !!details.enabled : true,
        });
      } else {
        resetForm();
      }
    } catch (error) {
      toast({
        title: "خطأ تحميل الموصل",
        description: "تعذر تحميل تفاصيل الموصل.",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharger) {
      toast({
        title: "اختر شاحن",
        description: "يرجى اختيار الشاحن أولا.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.connector_type) {
      toast({
        title: "نوع الموصل مطلوب",
        description: "أدخل نوع الموصل.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const res = await saveConnector({
        connectorId: selectedConnector === "__NEW_CONNECTOR__" ? undefined : selectedConnector,
        chargerId: selectedCharger,
        connectorType: formData.connector_type || "",
        status: formData.status || "available",
        power: formData.power,
        powerUnit: formData.power_unit,
        timeLimit: formData.time_limit,
        pin: formData.pin,
        ocpiStandard: formData.ocpi_standard,
        ocpiFormat: formData.ocpi_format,
        ocpiPowerType: formData.ocpi_power_type,
        ocpiMaxVoltage: formData.ocpi_max_voltage,
        ocpiMaxAmperage: formData.ocpi_max_amperage,
        ocpiTariffIds: formData.ocpi_tariff_ids,
        stopOn80: !!formData.stop_on80,
        enabled: formData.enabled !== false,
      });

      if (res.success) {
        toast({ title: "تم الحفظ", description: res.message });
        const opts = await fetchConnectorsByCharger(selectedCharger);
        setConnectorOptions([{ value: "__NEW_CONNECTOR__", label: "--- New Connector ---" }, ...opts]);
        setSelectedConnector("__NEW_CONNECTOR__");
        resetForm();
      } else {
        toast({ title: "لم يتم الحفظ", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "خطأ غير متوقع",
        description: "تعذر حفظ الموصل.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const breadcrumb = useMemo(
    () =>
      `ION Dashboard / Connectors / ${activeTab === "overview" ? "Overview" : "Add Connector"}`,
    [activeTab]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Connectors</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage connector configurations and settings
          </p>

          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">{breadcrumb}</div>
        </div>

        <div className="pt-2">
          {activeTab === "overview" && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <h2 className="text-lg font-semibold mb-4">Connector Overview</h2>
              <p className="text-muted-foreground text-sm">
                استخدم تبويب Add Connector لإضافة أو تحديث موصلات الشواحن.
              </p>
            </div>
          )}

          {activeTab === "add" && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <form className="space-y-6" onSubmit={handleSave}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Select
                      disabled={loadingOrgs}
                      value={selectedOrg}
                      onValueChange={setSelectedOrg}
                    >
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
                    <Label>Status</Label>
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
                    <Label>Power</Label>
                    <Input
                      value={formData.power ?? ""}
                      onChange={(e) => setFormData((p) => ({ ...p, power: e.target.value }))}
                      placeholder="e.g., 7.2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Power Unit</Label>
                    <Select
                      value={formData.power_unit || "kW"}
                      onValueChange={(val) => setFormData((p) => ({ ...p, power_unit: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {powerUnitOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time Limit (min)</Label>
                    <Input
                      type="number"
                      min={0}
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
                      placeholder="****"
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>OCPI Max Amperage</Label>
                    <Input
                      value={formData.ocpi_max_amperage ?? ""}
                      onChange={(e) => setFormData((p) => ({ ...p, ocpi_max_amperage: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>OCPI Tariff Ids</Label>
                    <Input
                      value={formData.ocpi_tariff_ids ?? ""}
                      onChange={(e) => setFormData((p) => ({ ...p, ocpi_tariff_ids: e.target.value }))}
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
                      <Label className="text-base">Enable Connector</Label>
                      <p className="text-sm text-muted-foreground">
                        Toggle connector availability
                      </p>
                    </div>
                    <Switch
                      checked={formData.enabled !== false}
                      onCheckedChange={(checked) => setFormData((p) => ({ ...p, enabled: checked }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" type="button" onClick={resetForm} disabled={saving}>
                    Cancel / New
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving
                      ? "Saving..."
                      : selectedConnector === "__NEW_CONNECTOR__"
                        ? "Add Connector"
                        : "Update Connector"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Connectors;
