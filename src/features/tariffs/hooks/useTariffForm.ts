import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  fetchTariffByConnector,
  saveTariff,
  deleteTariff,
  normalizeTariffApiRow,
  connectorHasTariff,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption, TariffRow } from "@/types";

const initialTariff: TariffRow = {
  tariff_id: "",
  type: "energy",
  buy_rate: 0,
  sell_rate: 0,
  transaction_fees: 0,
  client_percentage: 0,
  partner_percentage: 0,
  peak_type: "NA",
  status: "active",
};

export function useTariffForm(
  activeTab: string,
  prefilledOrgId?: string,
  prefilledLocationId?: string,
  prefilledChargerId?: string,
  prefilledConnectorId?: string,
  onWizardSave?: (payload: { tariffId: string; tariffName: string }) => void
) {
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
  const savingRef = useRef(false);
  const [inlineFeedback, setInlineFeedback] = useState<{
    variant: "default" | "destructive";
    title: string;
    description?: string;
  } | null>(null);

  const clearInlineFeedback = useCallback(() => setInlineFeedback(null), []);

  const applyConnectorTariff = useCallback((raw: Record<string, unknown> | null | undefined) => {
    if (!raw || !connectorHasTariff(raw)) {
      setCurrentTariffForConnector(null);
      setSelectedTariff("__NEW__");
      setTariff({ ...initialTariff });
      return;
    }
    const row = normalizeTariffApiRow(raw);
    setCurrentTariffForConnector(row);
    setSelectedTariff(row.tariff_id ? String(row.tariff_id) : "__NEW__");
    setTariff(row);
  }, []);

  const resolveExistingTariffId = useCallback((): string | undefined => {
    const fromConnector = String(currentTariffForConnector?.tariff_id ?? "").trim();
    if (fromConnector) return fromConnector;
    const fromForm = String(tariff.tariff_id ?? "").trim();
    if (fromForm) return fromForm;
    return undefined;
  }, [currentTariffForConnector, tariff.tariff_id]);

  const resetTariff = useCallback(() => {
    if (currentTariffForConnector && (currentTariffForConnector.tariff_id || currentTariffForConnector.type)) {
      setTariff({
        tariff_id: currentTariffForConnector.tariff_id ?? "",
        type: currentTariffForConnector.type ?? "energy",
        buy_rate: currentTariffForConnector.buy_rate ?? 0,
        sell_rate: currentTariffForConnector.sell_rate ?? 0,
        transaction_fees: currentTariffForConnector.transaction_fees ?? 0,
        client_percentage: currentTariffForConnector.client_percentage ?? 0,
        partner_percentage: currentTariffForConnector.partner_percentage ?? 0,
        peak_type: currentTariffForConnector.peak_type ?? "NA",
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
        setSelectedOrg(prefilledOrgId || opts[0]?.value || "");
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
  }, [activeTab, prefilledOrgId]);

  useEffect(() => {
    if (prefilledOrgId) setSelectedOrg(prefilledOrgId);
  }, [prefilledOrgId]);
  useEffect(() => {
    if (prefilledLocationId) setSelectedLocation(prefilledLocationId);
  }, [prefilledLocationId]);
  useEffect(() => {
    if (prefilledChargerId) setSelectedCharger(prefilledChargerId);
  }, [prefilledChargerId]);
  useEffect(() => {
    if (prefilledConnectorId) setSelectedConnector(prefilledConnectorId);
  }, [prefilledConnectorId]);

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
        setSelectedLocation(prefilledLocationId || opts[0]?.value || "");
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
  }, [selectedOrg, activeTab, prefilledLocationId]);

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
        setSelectedCharger(prefilledChargerId || opts[0]?.value || "");
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
  }, [selectedLocation, activeTab, prefilledChargerId]);

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
        setSelectedConnector(prefilledConnectorId || opts[0]?.value || "");
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
  }, [selectedCharger, activeTab, prefilledConnectorId]);

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
    setInlineFeedback(null);
    const load = async () => {
      try {
        const res = await fetchTariffByConnector(selectedConnector);
        if (cancelled) return;
        applyConnectorTariff(res?.data?.[0]);
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
  }, [selectedConnector, activeTab, applyConnectorTariff]);

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
    if (savingRef.current) return;
    if (!selectedConnector) {
      toast({
        title: "Select a connector",
        description: "You must select a connector to save the tariff.",
        variant: "destructive",
      });
      setInlineFeedback({
        variant: "destructive",
        title: "Select a connector",
        description: "You must select a connector to save the tariff.",
      });
      return;
    }
    if (!tariff.type?.trim()) {
      toast({
        title: "Required fields",
        description: "Type is required.",
        variant: "destructive",
      });
      setInlineFeedback({
        variant: "destructive",
        title: "Required fields",
        description: "Type is required.",
      });
      return;
    }
    if (
      tariff.buy_rate === undefined ||
      tariff.buy_rate === null ||
      Number.isNaN(Number(tariff.buy_rate))
    ) {
      toast({
        title: "Required fields",
        description: "Buy rate is required.",
        variant: "destructive",
      });
      setInlineFeedback({
        variant: "destructive",
        title: "Required fields",
        description: "Buy rate is required.",
      });
      return;
    }
    if (
      tariff.sell_rate === undefined ||
      tariff.sell_rate === null ||
      Number.isNaN(Number(tariff.sell_rate))
    ) {
      toast({
        title: "Required fields",
        description: "Sell rate is required.",
        variant: "destructive",
      });
      setInlineFeedback({
        variant: "destructive",
        title: "Required fields",
        description: "Sell rate is required.",
      });
      return;
    }

    const existingTariffId = resolveExistingTariffId();
    try {
      savingRef.current = true;
      setSaving(true);
      const saveResult = await saveTariff({
        tariffId: existingTariffId,
        connectorId: selectedConnector,
        type: tariff.type,
        buyRate: Number(tariff.buy_rate),
        sellRate: Number(tariff.sell_rate),
        transactionFees: Number(tariff.transaction_fees ?? 0),
        clientPercentage: Number(tariff.client_percentage ?? 0),
        partnerPercentage: Number(tariff.partner_percentage ?? 0),
        peakType: tariff.peak_type || "NA",
        status: (tariff.status || "active").toLowerCase(),
      });

      if (!saveResult.success) {
        toast({ title: "Not saved", description: saveResult.message, variant: "destructive" });
        setInlineFeedback({
          variant: "destructive",
          title: "Could not save tariff",
          description: saveResult.message,
        });
        return;
      }

      toast({ title: "Saved", description: saveResult.message });
      setInlineFeedback({
        variant: "default",
        title: "Tariff saved",
        description: saveResult.message,
      });

      try {
        const refetch = await fetchTariffByConnector(selectedConnector);
        const d = refetch?.data?.[0];
        if (d && connectorHasTariff(d)) {
          const row = normalizeTariffApiRow(d);
          setCurrentTariffForConnector(row);
          setSelectedTariff(row.tariff_id ? String(row.tariff_id) : "__NEW__");
          setTariff(row);
          onWizardSave?.({
            tariffId: row.tariff_id ? String(row.tariff_id) : String(saveResult.tariffId ?? ""),
            tariffName: row.type || "Tariff",
          });
        } else if (saveResult.tariffId) {
          const row: TariffRow = {
            ...tariff,
            tariff_id: saveResult.tariffId,
          };
          setCurrentTariffForConnector(row);
          setSelectedTariff(saveResult.tariffId);
          setTariff(row);
          onWizardSave?.({
            tariffId: saveResult.tariffId,
            tariffName: row.type || "Tariff",
          });
        } else if (onWizardSave) {
          onWizardSave({
            tariffId: String(existingTariffId ?? ""),
            tariffName: tariff.type || "Tariff",
          });
        }
      } catch (refreshError) {
        console.warn("Tariff saved but refresh failed:", refreshError);
      }
    } catch (error) {
      toast({
        title: "Unexpected error",
        description: "Could not save the tariff.",
        variant: "destructive",
      });
      setInlineFeedback({
        variant: "destructive",
        title: "Could not save tariff",
        description: "An unexpected error occurred.",
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDeleteTariff = async () => {
    const tariffIdToDelete = resolveExistingTariffId();
    if (!tariffIdToDelete) return;
    if (savingRef.current) return;
    try {
      savingRef.current = true;
      setSaving(true);
      const result = await deleteTariff(tariffIdToDelete);
      if (result.success) {
        toast({ title: "Deleted", description: result.message });
        setInlineFeedback({
          variant: "default",
          title: "Tariff deleted",
          description: result.message,
        });
        setCurrentTariffForConnector(null);
        setSelectedTariff("__NEW__");
        resetTariff();
      } else {
        toast({ title: "Delete failed", description: result.message, variant: "destructive" });
        setInlineFeedback({
          variant: "destructive",
          title: "Delete failed",
          description: result.message,
        });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not delete tariff.", variant: "destructive" });
      setInlineFeedback({
        variant: "destructive",
        title: "Could not delete tariff",
        description: "An unexpected error occurred.",
      });
    } finally {
      savingRef.current = false;
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
    currentTariffForConnector,
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
    inlineFeedback,
    clearInlineFeedback,
  };
}
