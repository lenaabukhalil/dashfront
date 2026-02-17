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

export type ChargerFormData = Omit<ChargerDetail, "charger_id">;

const initialFormData: ChargerFormData = {
  name: "",
  type: "",
  status: "",
  max_session_time: undefined,
  num_connectors: undefined,
  description: "",
};

export function useChargerForm(
  activeTab: string,
  canRead: (permission: string) => boolean,
  selectedCharger: string,
  setSelectedCharger: (v: string) => void,
  onChargerSaved?: () => void
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
        if (options.length > 0) {
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
  }, [canRead, activeTab]);

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
        setSelectedLocation((prev) => (prev ? prev : first));
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
  }, [selectedOrg, activeTab]);

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
        setFormData({
          name: details.name ?? "",
          type: details.type ?? "",
          status: details.status ?? "",
          max_session_time: details.max_session_time,
          num_connectors: details.num_connectors,
          description: details.description ?? "",
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
      const result = await saveCharger({
        chargerId: selectedCharger === "__NEW_CHARGER__" ? undefined : selectedCharger,
        locationId: selectedLocation,
        name: formData.name,
        type: formData.type || "AC",
        status: formData.status || "offline",
        maxSessionTime: formData.max_session_time,
        numConnectors: formData.num_connectors,
        description: formData.description,
      });

      if (result.success) {
        toast({
          title: "Saved",
          description: result.message,
        });
        onChargerSaved?.();
        const options = await fetchChargersByLocation(selectedLocation);
        setChargerOptions([{ value: "__NEW_CHARGER__", label: "--- New Charger ---" }, ...options]);
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
