import { useEffect, useState } from "react";
import {
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption } from "@/types";

export function useReimbursementFilters(initialOrgValue: string) {
  const [selectedOrgForFilters, setSelectedOrgForFilters] = useState<string>("");
  const [selectedLocationForFilters, setSelectedLocationForFilters] = useState<string>("");
  const [selectedChargerForFilters, setSelectedChargerForFilters] = useState<string>("");
  const [selectedConnectorForFilters, setSelectedConnectorForFilters] = useState<string>("");

  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);
  const [connectorOptions, setConnectorOptions] = useState<SelectOption[]>([]);

  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingChargers, setLoadingChargers] = useState(false);
  const [loadingConnectors, setLoadingConnectors] = useState(false);

  useEffect(() => {
    if (initialOrgValue) {
      setSelectedOrgForFilters(initialOrgValue);
    }
  }, [initialOrgValue]);

  useEffect(() => {
    if (!selectedOrgForFilters) {
      setLocationOptions([]);
      setSelectedLocationForFilters("");
      return;
    }
    const load = async () => {
      try {
        setLoadingLocations(true);
        const opts = await fetchLocationsByOrg(selectedOrgForFilters);
        setLocationOptions(opts);
        setSelectedLocationForFilters(opts[0]?.value ?? "");
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
  }, [selectedOrgForFilters]);

  useEffect(() => {
    if (!selectedLocationForFilters) {
      setChargerOptions([]);
      setSelectedChargerForFilters("");
      return;
    }
    const load = async () => {
      try {
        setLoadingChargers(true);
        const opts = await fetchChargersByLocation(selectedLocationForFilters);
        setChargerOptions(opts);
        setSelectedChargerForFilters(opts[0]?.value ?? "");
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
  }, [selectedLocationForFilters]);

  useEffect(() => {
    if (!selectedChargerForFilters) {
      setConnectorOptions([]);
      setSelectedConnectorForFilters("");
      return;
    }
    const load = async () => {
      try {
        setLoadingConnectors(true);
        const opts = await fetchConnectorsByCharger(selectedChargerForFilters);
        setConnectorOptions(opts);
        setSelectedConnectorForFilters(opts[0]?.value ?? "");
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
  }, [selectedChargerForFilters]);

  return {
    selectedOrgForFilters,
    setSelectedOrgForFilters,
    selectedLocationForFilters,
    setSelectedLocationForFilters,
    selectedChargerForFilters,
    setSelectedChargerForFilters,
    selectedConnectorForFilters,
    setSelectedConnectorForFilters,
    locationOptions,
    chargerOptions,
    connectorOptions,
    loadingLocations,
    loadingChargers,
    loadingConnectors,
  };
}
