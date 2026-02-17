import { useEffect, useState } from "react";
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  fetchConnectorDetails,
  saveConnector,
  deleteConnector,
  type ConnectorDetail,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption } from "@/types";

const initialFormData: ConnectorDetail = {
  connector_type: "",
  status: "",
  power: "",
  power_unit: "",
  time_limit: undefined,
  pin: "",
  ocpi_id: "",
  ocpi_standard: "",
  ocpi_format: "",
  ocpi_power_type: "",
  ocpi_max_voltage: "",
  ocpi_max_amperage: "",
  ocpi_tariff_ids: "",
  stop_on80: false,
  available: true,
  enabled: true,
};

export function useConnectorForm(activeTab: string, onConnectorSaved?: () => void) {
  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);
  const [connectorOptions, setConnectorOptions] = useState<SelectOption[]>([]);

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedCharger, setSelectedCharger] = useState<string>("");
  const [selectedConnector, setSelectedConnector] = useState<string>("__NEW_CONNECTOR__");

  const [formData, setFormData] = useState<ConnectorDetail>({ ...initialFormData });

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingChargers, setLoadingChargers] = useState(false);
  const [loadingConnectors, setLoadingConnectors] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({ ...initialFormData });
    setSelectedConnector("__NEW_CONNECTOR__");
  };

  useEffect(() => {
    if (activeTab !== "add") return;
    const load = async () => {
      try {
        setLoadingOrgs(true);
        const opts = await fetchChargerOrganizations();
        setOrgOptions(opts);
        if (opts.length) setSelectedOrg(opts[0].value);
      } catch (error) {
        toast({
          title: "Failed to load organizations",
          description: "Could not load the organizations list.",
          variant: "destructive",
        });
      } finally {
        setLoadingOrgs(false);
      }
    };
    load();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "add") return;
    if (!selectedOrg) {
      setLocationOptions([]);
      setSelectedLocation("");
      return;
    }
    const load = async () => {
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
  }, [selectedOrg, activeTab]);

  useEffect(() => {
    if (activeTab !== "add") return;
    if (!selectedLocation) {
      setChargerOptions([]);
      setSelectedCharger("");
      return;
    }
    const load = async () => {
      try {
        setLoadingChargers(true);
        const opts = await fetchChargersByLocation(selectedLocation);
        setChargerOptions(opts);
        setSelectedCharger(opts[0]?.value ?? "");
      } catch (error) {
        toast({
          title: "Failed to load chargers",
          description: "Could not load chargers for this location.",
          variant: "destructive",
        });
      } finally {
        setLoadingChargers(false);
      }
    };
    load();
  }, [selectedLocation, activeTab]);

  useEffect(() => {
    if (activeTab !== "add") return;
    if (!selectedCharger) {
      setConnectorOptions([]);
      setSelectedConnector("__NEW_CONNECTOR__");
      return;
    }
    const load = async () => {
      try {
        setLoadingConnectors(true);
        const opts = await fetchConnectorsByCharger(selectedCharger);
        setConnectorOptions([{ value: "__NEW_CONNECTOR__", label: "--- New Connector ---" }, ...opts]);
        setSelectedConnector("__NEW_CONNECTOR__");
        resetForm();
      } catch (error) {
        toast({
          title: "Failed to load connectors",
          description: "Could not load connectors for this charger.",
          variant: "destructive",
        });
      } finally {
        setLoadingConnectors(false);
      }
    };
    load();
  }, [selectedCharger, activeTab]);

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
          ocpi_id: details.ocpi_id ?? "",
          ocpi_standard: details.ocpi_standard ?? "",
          ocpi_format: details.ocpi_format ?? "",
          ocpi_power_type: details.ocpi_power_type ?? "",
          ocpi_max_voltage: details.ocpi_max_voltage ?? "",
          ocpi_max_amperage: details.ocpi_max_amperage ?? "",
          ocpi_tariff_ids: details.ocpi_tariff_ids ?? "",
          stop_on80: !!details.stop_on80,
          available: details.available !== undefined ? !!details.available : true,
          enabled: details.enabled !== undefined ? !!details.enabled : true,
        });
      } else {
        resetForm();
      }
    } catch (error) {
      toast({
        title: "Failed to load connector",
        description: "Could not load connector details.",
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
        ocpiId: formData.ocpi_id,
        ocpiStandard: formData.ocpi_standard,
        ocpiFormat: formData.ocpi_format,
        ocpiPowerType: formData.ocpi_power_type,
        ocpiMaxVoltage: formData.ocpi_max_voltage,
        ocpiMaxAmperage: formData.ocpi_max_amperage,
        ocpiTariffIds: formData.ocpi_tariff_ids,
        stopOn80: !!formData.stop_on80,
        available: formData.available !== false,
        enabled: formData.enabled !== false,
      });

      if (res.success) {
        toast({ title: "Saved", description: res.message });
        onConnectorSaved?.();
        const opts = await fetchConnectorsByCharger(selectedCharger);
        setConnectorOptions([{ value: "__NEW_CONNECTOR__", label: "--- New Connector ---" }, ...opts]);
        setSelectedConnector("__NEW_CONNECTOR__");
        resetForm();
      } else {
        toast({ title: "Not saved", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "Unexpected error",
        description: "Could not save the connector.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConnector = async () => {
    if (selectedConnector === "__NEW_CONNECTOR__" || !selectedConnector) return;
    try {
      setSaving(true);
      const result = await deleteConnector(selectedConnector);
      if (result.success) {
        toast({ title: "Deleted", description: result.message });
        onConnectorSaved?.();
        resetForm();
        const opts = await fetchConnectorsByCharger(selectedCharger);
        setConnectorOptions([{ value: "__NEW_CONNECTOR__", label: "--- New Connector ---" }, ...opts]);
        setSelectedConnector("__NEW_CONNECTOR__");
      } else {
        toast({ title: "Delete failed", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not delete connector.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return {
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
  };
}
