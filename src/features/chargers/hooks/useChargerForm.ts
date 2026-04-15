import { useEffect, useState } from "react";
import {
  fetchChargerDetails,
  fetchChargerOrganizations,
  fetchChargersByLocation,
  fetchLocationsByOrg,
  saveCharger,
  deleteCharger,
  type ChargerDetail,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption } from "@/types";

export interface ChargerFormData {
  name: string;
  type: string;
  status: string;
  max_session_time?: number;
  num_connectors?: number;
  description?: string;
  enabled: boolean;
  available: boolean;
  isGAM: boolean;
  ion_fees_id: number | null;
  prompt_id: number | null;
  ocpi_uid: string;
  ocpi_id: string;
  ocpi_status: string;
  ocpi_directions: string;
  ocpi_directions_en: string;
}

const initialFormData: ChargerFormData = {
  name: "",
  type: "",
  status: "",
  max_session_time: undefined,
  num_connectors: undefined,
  description: "",
  enabled: true,
  available: true,
  isGAM: false,
  ion_fees_id: null,
  prompt_id: null,
  ocpi_uid: "",
  ocpi_id: "",
  ocpi_status: "",
  ocpi_directions: "",
  ocpi_directions_en: "",
};

export function useChargerForm(
  activeTab: string,
  canRead: (permission: string) => boolean,
  selectedCharger: string,
  setSelectedCharger: (v: string) => void,
  onChargerSaved?: () => void,
  prefilledOrgId?: string,
  prefilledLocationId?: string,
  onWizardSave?: (payload: { chargerId: string; chargerName: string }) => void
) {
  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  const [formData, setFormData] = useState<ChargerFormData>({ ...initialFormData });

  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingChargers, setIsLoadingChargers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingChargerDetails, setIsLoadingChargerDetails] = useState(false);

  const resetForm = () => {
    setFormData({ ...initialFormData });
    setSelectedCharger("__NEW_CHARGER__");
  };

  useEffect(() => {
    if (!canRead("charger.status") || activeTab !== "add") {
      return;
    }

    const loadOrganizations = async () => {
      try {
        console.log("📋 Loading organizations for Add Charger tab...");
        setIsLoadingOrgs(true);
        const options = await fetchChargerOrganizations();
        console.log("✅ Organizations loaded:", options);
        setOrgOptions(options);
        if (prefilledOrgId) {
          setSelectedOrg(prefilledOrgId);
        } else if (options.length > 0) {
          setSelectedOrg((prev) => prev || options[0].value);
        } else {
          console.warn("⚠️ No organizations found");
          toast({
            title: "No Organizations",
            description: "No organizations found in the system.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("❌ Error loading organizations:", error);
        toast({
          title: "Failed to load organizations",
          description: "Please check the Node-RED backend connection.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingOrgs(false);
      }
    };

    loadOrganizations();
  }, [canRead, activeTab, prefilledOrgId]);

  useEffect(() => {
    if (prefilledOrgId) setSelectedOrg(prefilledOrgId);
  }, [prefilledOrgId]);

  useEffect(() => {
    if (prefilledLocationId) setSelectedLocation(prefilledLocationId);
  }, [prefilledLocationId]);

  useEffect(() => {
    if (activeTab !== "add") {
      return;
    }

    const loadLocations = async () => {
      if (!selectedOrg) {
        setLocationOptions([]);
        setSelectedLocation("");
        return;
      }
      try {
        console.log("📍 Loading locations for organization:", selectedOrg);
        setIsLoadingLocations(true);
        const options = await fetchLocationsByOrg(selectedOrg);
        console.log("✅ Locations loaded:", options);
        setLocationOptions(options);
        const first = options[0]?.value ?? "";
        setSelectedLocation((prev) => prefilledLocationId || (prev ? prev : first));
        if (options.length === 0) {
          console.warn("⚠️ No locations found for organization:", selectedOrg);
          toast({
            title: "No locations",
            description: "No locations were found for this organization.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("❌ Error loading locations:", error);
        toast({
          title: "Failed to load locations",
          description: "Could not retrieve locations from the backend.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingLocations(false);
      }
    };

    loadLocations();
  }, [selectedOrg, activeTab, prefilledLocationId]);

  useEffect(() => {
    if (activeTab !== "add") {
      return;
    }

    const loadChargers = async () => {
      if (!selectedLocation) {
        setChargerOptions([]);
        setSelectedCharger("__NEW_CHARGER__");
        return;
      }

      try {
        console.log("🔌 Loading chargers for location:", selectedLocation);
        setIsLoadingChargers(true);
        const options = await fetchChargersByLocation(selectedLocation);
        console.log("✅ Chargers loaded:", options);
        const withNewOption: SelectOption[] = [
          { value: "__NEW_CHARGER__", label: "--- New Charger ---" },
          ...options,
        ];
        setChargerOptions(withNewOption);
        setSelectedCharger("__NEW_CHARGER__");
        resetForm();
      } catch (error) {
        console.error("❌ Error loading chargers:", error);
        toast({
          title: "Failed to load chargers",
          description: "Could not retrieve chargers for this location.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingChargers(false);
      }
    };

    loadChargers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetForm/setSelectedCharger intentionally excluded to avoid extra runs
  }, [selectedLocation, activeTab]);

  const handleSelectCharger = async (value: string) => {
    setSelectedCharger(value);
    if (value === "__NEW_CHARGER__") {
      resetForm();
      return;
    }

    try {
      setIsLoadingChargerDetails(true);
      const details = await fetchChargerDetails(value);
      if (details) {
        const row = details as ChargerDetail & {
          enabled?: boolean | number;
          available?: boolean | number;
          isGAM?: boolean | number;
          ion_fees_id?: number | null;
          prompt_id?: number | null;
          ocpi_uid?: string;
          ocpi_id?: string;
          ocpi_status?: string;
          ocpi_directions?: string;
          ocpi_directions_en?: string;
        };
        setFormData({
          name: row.name ?? "",
          type: row.type ?? "",
          status: row.status ?? "",
          max_session_time: row.max_session_time,
          num_connectors: row.num_connectors,
          description: row.description ?? "",
          enabled: row.enabled !== undefined ? Number(row.enabled) === 1 : true,
          available: row.available !== undefined ? Number(row.available) === 1 : true,
          isGAM: row.isGAM !== undefined ? Number(row.isGAM) === 1 : false,
          ion_fees_id: row.ion_fees_id ?? null,
          prompt_id: row.prompt_id ?? null,
          ocpi_uid: row.ocpi_uid ?? "",
          ocpi_id: row.ocpi_id ?? "",
          ocpi_status: row.ocpi_status ?? "",
          ocpi_directions: row.ocpi_directions ?? "",
          ocpi_directions_en: row.ocpi_directions_en ?? "",
        });
      } else {
        resetForm();
        toast({
          title: "Charger details not found",
          description: "Opening the new charger form.",
        });
      }
    } catch (error) {
      console.error("Error loading charger details:", error);
      toast({
        title: "Failed to load charger details",
        description: "Could not retrieve charger details.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingChargerDetails(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOrg) {
      toast({
        title: "Select an organization",
        description: "You must select an organization before saving.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedLocation) {
      toast({
        title: "Select a location",
        description: "You must select a location before saving.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.name.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter a charger name.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        chargerId: selectedCharger === "__NEW_CHARGER__" ? undefined : selectedCharger,
        locationId: selectedLocation,
        name: formData.name,
        type: formData.type || "AC",
        status: formData.status || "offline",
        maxSessionTime: formData.max_session_time,
        numConnectors: formData.num_connectors,
        description: formData.description,
        enabled: formData.enabled,
        available: formData.available,
        isGAM: formData.isGAM,
        ion_fees_id: formData.ion_fees_id,
        prompt_id: formData.prompt_id,
        ocpi_uid: formData.ocpi_uid,
        ocpi_id: formData.ocpi_id,
        ocpi_status: formData.ocpi_status,
        ocpi_directions: formData.ocpi_directions,
        ocpi_directions_en: formData.ocpi_directions_en,
      };
      const result = await saveCharger(payload);

      if (result.success) {
        toast({
          title: "Saved",
          description: result.message,
        });
        onChargerSaved?.();
        const options = await fetchChargersByLocation(selectedLocation);
        setChargerOptions([{ value: "__NEW_CHARGER__", label: "--- New Charger ---" }, ...options]);
        const resolved =
          result.chargerId ||
          options.find((o) => o.label.trim().toLowerCase() === formData.name.trim().toLowerCase())?.value ||
          options[options.length - 1]?.value;
        if (resolved) {
          onWizardSave?.({ chargerId: resolved, chargerName: formData.name.trim() || "Charger" });
        }
        setSelectedCharger("__NEW_CHARGER__");
        resetForm();
      } else {
        toast({
          title: "Not saved",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving charger:", error);
      toast({
        title: "Unexpected error",
        description: "Could not save charger details.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCharger = async () => {
    if (selectedCharger === "__NEW_CHARGER__" || !selectedCharger) return;
    try {
      setIsSaving(true);
      const result = await deleteCharger(selectedCharger);
      if (result.success) {
        toast({ title: "Deleted", description: result.message });
        onChargerSaved?.();
        resetForm();
        const options = await fetchChargersByLocation(selectedLocation);
        setChargerOptions([{ value: "__NEW_CHARGER__", label: "--- New Charger ---" }, ...options]);
        setSelectedCharger("__NEW_CHARGER__");
      } else {
        toast({ title: "Delete failed", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error deleting charger:", error);
      toast({ title: "Error", description: "Could not delete charger.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    orgOptions,
    locationOptions,
    chargerOptions,
    selectedOrg,
    setSelectedOrg,
    selectedLocation,
    setSelectedLocation,
    formData,
    setFormData,
    isLoadingOrgs,
    isLoadingLocations,
    isLoadingChargers,
    isSaving,
    isLoadingChargerDetails,
    resetForm,
    handleSelectCharger,
    handleSave,
    handleDeleteCharger,
  };
}
