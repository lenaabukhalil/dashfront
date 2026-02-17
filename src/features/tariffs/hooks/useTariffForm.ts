import { useCallback, useEffect, useState } from "react";
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  fetchTariffByConnector,
  saveTariff,
  deleteTariff,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption, TariffRow } from "@/types";

const initialTariff: TariffRow = {
  tariff_id: "",
  type: "",
  buy_rate: 0,
  sell_rate: 0,
  transaction_fees: 0,
  client_percentage: 0,
  partner_percentage: 0,
  peak_type: "",
  status: "active",
};

export function useTariffForm(activeTab: string) {
  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);
  const [connectorOptions, setConnectorOptions] = useState<SelectOption[]>([]);

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedCharger, setSelectedCharger] = useState<string>("");
  const [selectedConnector, setSelectedConnector] = useState<string>("");
  const [selectedTariff, setSelectedTariff] = useState<string>("__NEW__");
  const [currentTariffForConnector, setCurrentTariffForConnector] = useState<TariffRow | null>(null);

  const [tariff, setTariff] = useState<TariffRow>({ ...initialTariff });

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingChargers, setLoadingChargers] = useState(false);
  const [loadingConnectors, setLoadingConnectors] = useState(false);
  const [loadingTariff, setLoadingTariff] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetTariff = useCallback(() => {
    if (currentTariffForConnector && (currentTariffForConnector.tariff_id || currentTariffForConnector.type)) {
      setTariff({
        tariff_id: currentTariffForConnector.tariff_id ?? "",
        type: currentTariffForConnector.type ?? "",
        buy_rate: currentTariffForConnector.buy_rate ?? 0,
        sell_rate: currentTariffForConnector.sell_rate ?? 0,
        transaction_fees: currentTariffForConnector.transaction_fees ?? 0,
        client_percentage: currentTariffForConnector.client_percentage ?? 0,
        partner_percentage: currentTariffForConnector.partner_percentage ?? 0,
        peak_type: currentTariffForConnector.peak_type ?? "",
        status: currentTariffForConnector.status ?? "active",
      });
    } else {
      setTariff({ ...initialTariff });
    }
  }, [currentTariffForConnector]);

  const tariffOptions: SelectOption[] = [
    { value: "__NEW__", label: "Add new Tariffs" },
    ...(currentTariffForConnector?.tariff_id
      ? [
          {
            value: String(currentTariffForConnector.tariff_id),
            label: `${currentTariffForConnector.type || "Tariff"} (${currentTariffForConnector.status || "—"})`,
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (activeTab !== "add") return;
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
          description: "Could not load chargers.",
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
      setSelectedConnector("");
      setCurrentTariffForConnector(null);
      setSelectedTariff("__NEW__");
      setTariff({ ...initialTariff });
      return;
    }
    const load = async () => {
      try {
        setLoadingConnectors(true);
        const opts = await fetchConnectorsByCharger(selectedCharger);
        setConnectorOptions(opts);
        setSelectedConnector(opts[0]?.value ?? "");
        setCurrentTariffForConnector(null);
        setSelectedTariff("__NEW__");
        setTariff({ ...initialTariff });
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
  }, [selectedCharger, activeTab]);

  useEffect(() => {
    if (activeTab !== "add" || !selectedConnector) {
      setCurrentTariffForConnector(null);
      setSelectedTariff("__NEW__");
      setTariff({ ...initialTariff });
    }
  }, [activeTab, selectedConnector]);

  useEffect(() => {
    if (activeTab !== "add" || !selectedConnector) return () => {};
    let cancelled = false;
    setLoadingTariff(true);
    const load = async () => {
      try {
        const data = await fetchTariffByConnector(selectedConnector);
        if (cancelled) return;
        if (data && ((data as { tariff_id?: unknown }).tariff_id != null || (data as { type?: unknown }).type !== undefined)) {
          const d = data as Record<string, unknown>;
          const row: TariffRow = {
            tariff_id: String(d.tariff_id ?? ""),
            type: String(d.type ?? ""),
            buy_rate: Number(d.buy_rate ?? 0),
            sell_rate: Number(d.sell_rate ?? 0),
            transaction_fees: Number(d.transaction_fees ?? 0),
            client_percentage: Number(d.client_percentage ?? 0),
            partner_percentage: Number(d.partner_percentage ?? 0),
            peak_type: String(d.peak_type ?? ""),
            status: String(d.status ?? ""),
          };
          setCurrentTariffForConnector(row);
          setSelectedTariff(row.tariff_id ? String(row.tariff_id) : "__NEW__");
          setTariff(row);
        } else {
          setCurrentTariffForConnector(null);
          setSelectedTariff("__NEW__");
          setTariff({ ...initialTariff });
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Failed to load tariff",
            description: "Could not load tariff for the selected connector.",
            variant: "destructive",
          });
          setCurrentTariffForConnector(null);
          setSelectedTariff("__NEW__");
          setTariff({ ...initialTariff });
        }
      } finally {
        if (!cancelled) setLoadingTariff(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedConnector, activeTab]);

  const handleSelectConnector = (value: string) => setSelectedConnector(value);

  const handleSelectTariff = (value: string) => {
    setSelectedTariff(value);
    if (value === "__NEW__") {
      resetTariff();
    } else if (currentTariffForConnector?.tariff_id === value) {
      setTariff({ ...currentTariffForConnector });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnector) {
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

    const tariffIdForSave = selectedTariff !== "__NEW__" ? selectedTariff : undefined;
    try {
      setSaving(true);
      const res = await saveTariff({
        tariffId: tariffIdForSave ?? tariff.tariff_id,
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
        const data = await fetchTariffByConnector(selectedConnector);
        if (data && ((data as { tariff_id?: unknown }).tariff_id != null || (data as { type?: unknown }).type !== undefined)) {
          const d = data as Record<string, unknown>;
          const row: TariffRow = {
            tariff_id: String(d.tariff_id ?? ""),
            type: String(d.type ?? ""),
            buy_rate: Number(d.buy_rate ?? 0),
            sell_rate: Number(d.sell_rate ?? 0),
            transaction_fees: Number(d.transaction_fees ?? 0),
            client_percentage: Number(d.client_percentage ?? 0),
            partner_percentage: Number(d.partner_percentage ?? 0),
            peak_type: String(d.peak_type ?? ""),
            status: String(d.status ?? ""),
          };
          setCurrentTariffForConnector(row);
          setSelectedTariff(row.tariff_id ? String(row.tariff_id) : "__NEW__");
          setTariff(row);
        }
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

  const handleDeleteTariff = async () => {
    if (!tariff.tariff_id) return;
    try {
      setSaving(true);
      const result = await deleteTariff(tariff.tariff_id);
      if (result.success) {
        toast({ title: "Deleted", description: result.message });
        setCurrentTariffForConnector(null);
        setSelectedTariff("__NEW__");
        resetTariff();
      } else {
        toast({ title: "Delete failed", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not delete tariff.", variant: "destructive" });
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
  };
}
