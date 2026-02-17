import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  fetchLocationDetails,
  saveLocation,
  type LocationFormPayload,
  deleteLocation,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption } from "@/types";
import { LogoUpload } from "@/components/organizations/LogoUpload";
import { MapSelector } from "@/components/organizations/MapSelector";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { EntityFormActions } from "@/components/shared/EntityFormActions";

interface LocationFormData {
  location_id: string;
  name: string;
  name_ar: string;
  lat: string;
  lng: string;
  num_chargers: number | null;
  description: string;
  logo_url: string;
  ad_url: string;
  payment_types: string;
  availability: string;
  subscription: string;
  visible_on_map: boolean;
  ocpi_id: string;
  ocpi_name: string;
  ocpi_address: string;
  ocpi_city: string;
  ocpi_postal_code: string;
  ocpi_country: string;
  ocpi_visible: boolean;
  ocpi_facility: string;
  ocpi_parking_restrictions: string;
  ocpi_directions: string;
  ocpi_directions_en: string;
}

const DEFAULT_LAT_JO = "31.9539";
const DEFAULT_LNG_JO = "35.9106";

const emptyLocationFormData: LocationFormData = {
  location_id: "",
  name: "",
  name_ar: "",
  lat: DEFAULT_LAT_JO,
  lng: DEFAULT_LNG_JO,
  num_chargers: null,
  description: "",
  logo_url: "",
  ad_url: "",
  payment_types: "",
  availability: "",
  subscription: "free",
  visible_on_map: false,
  ocpi_id: "",
  ocpi_name: "",
  ocpi_address: "",
  ocpi_city: "",
  ocpi_postal_code: "",
  ocpi_country: "",
  ocpi_visible: false,
  ocpi_facility: "",
  ocpi_parking_restrictions: "",
  ocpi_directions: "",
  ocpi_directions_en: "",
};

const paymentTypeOptions = [
  { value: "ION", label: "ION" },
  { value: "Cash", label: "Cash" },
  { value: "ION & Cash", label: "ION & Cash" },
  { value: "All", label: "All" },
];

const availabilityOptions = [
  { value: "available", label: "Available" },
  { value: "coming_soon", label: "Coming Soon" },
  { value: "unavailable", label: "Unavailable" },
  { value: "offline", label: "Offline" },
];

const subscriptionOptions = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
];

const numChargersOptions = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} charger${i + 1 > 1 ? "s" : ""}`,
}));

export interface AddLocationFormProps {
  onLocationSaved?: () => void;
}

export const AddLocationForm = ({ onLocationSaved }: AddLocationFormProps) => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canWrite } = usePermission(role);

  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("__NEW_LOCATION__");
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<LocationFormData>({ ...emptyLocationFormData });
  const [initialSnapshot, setInitialSnapshot] = useState<LocationFormData>({ ...emptyLocationFormData });

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingOrgs(true);
        const opts = await fetchChargerOrganizations();
        setOrgOptions(opts);
        if (opts.length) setSelectedOrg(opts[0].value);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load organizations",
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
        setSelectedLocation("__NEW_LOCATION__");
        return;
      }
      try {
        setLoadingLocations(true);
        const opts = await fetchLocationsByOrg(selectedOrg);
        setLocationOptions([{ value: "__NEW_LOCATION__", label: "--- Add New Location ---" }, ...opts]);
        setSelectedLocation("__NEW_LOCATION__");
        resetForm();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load locations",
          variant: "destructive",
        });
      } finally {
        setLoadingLocations(false);
      }
    };
    load();
  }, [selectedOrg]);

  const resetForm = () => {
    setFormData({ ...emptyLocationFormData });
    setInitialSnapshot({ ...emptyLocationFormData });
    setSelectedLocation("__NEW_LOCATION__");
  };

  const handleLocationSelect = async (value: string) => {
    setSelectedLocation(value);
    if (value === "__NEW_LOCATION__") {
      resetForm();
      return;
    }

    setLoadingDetails(true);
    try {
      const locationDetails = await fetchLocationDetails(value);
      if (locationDetails) {
        const next: LocationFormData = {
          location_id: locationDetails.location_id || "",
          name: locationDetails.name || "",
          name_ar: locationDetails.name_ar || "",
          lat: locationDetails.lat || "",
          lng: locationDetails.lng || "",
          num_chargers: locationDetails.num_chargers || null,
          description: locationDetails.description || "",
          logo_url: locationDetails.logo_url || "",
          ad_url: locationDetails.ad_url || "",
          payment_types: locationDetails.payment_types || "",
          availability: locationDetails.availability || "",
          subscription: locationDetails.subscription || "free",
          visible_on_map: Boolean(locationDetails.visible_on_map),
          ocpi_id: locationDetails.ocpi_id || "",
          ocpi_name: locationDetails.ocpi_name || "",
          ocpi_address: locationDetails.ocpi_address || "",
          ocpi_city: locationDetails.ocpi_city || "",
          ocpi_postal_code: locationDetails.ocpi_postal_code || "",
          ocpi_country: locationDetails.ocpi_country || "",
          ocpi_visible: Boolean(locationDetails.ocpi_visible),
          ocpi_facility: locationDetails.ocpi_facility || "",
          ocpi_parking_restrictions: locationDetails.ocpi_parking_restrictions || "",
          ocpi_directions: locationDetails.ocpi_directions || "",
          ocpi_directions_en: locationDetails.ocpi_directions_en || "",
        };
        setFormData(next);
        setInitialSnapshot(next);
        toast({
          title: "Success",
          description: "Location details loaded successfully",
        });
      } else {
        toast({
          title: "Warning",
          description: "Could not load location details",
          variant: "destructive",
        });
        resetForm();
      }
    } catch (error) {
      console.error("Error loading location details:", error);
      toast({
        title: "Error",
        description: "Failed to load location details",
        variant: "destructive",
      });
      resetForm();
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDiscard = () => {
    if (formData.location_id) {
      setFormData({ ...initialSnapshot });
      return;
    }
    resetForm();
  };

  const handleDeleteLocation = async () => {
    if (!formData.location_id) return;
    setSaving(true);
    try {
      const result = await deleteLocation(formData.location_id);
      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Location deleted successfully",
        });
        onLocationSaved?.();
        if (selectedOrg) {
          const opts = await fetchLocationsByOrg(selectedOrg);
          setLocationOptions([
            { value: "__NEW_LOCATION__", label: "--- Add New Location ---" },
            ...opts,
          ]);
        } else {
          setLocationOptions([]);
        }
        resetForm();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to delete location",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      toast({
        title: "Error",
        description: "Failed to delete location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) {
      toast({
        title: "Validation Error",
        description: "Please select an organization",
        variant: "destructive",
      });
      return;
    }
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Location name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload: LocationFormPayload = {
        location_id: formData.location_id || undefined,
        organization_id: selectedOrg,
        name: formData.name,
        name_ar: formData.name_ar,
        lat: formData.lat,
        lng: formData.lng,
        num_chargers: formData.num_chargers || undefined,
        description: formData.description,
        logo_url: formData.logo_url,
        ad_url: formData.ad_url,
        payment_types: formData.payment_types,
        availability: formData.availability,
        subscription: formData.subscription,
        visible_on_map: formData.visible_on_map,
        ocpi_id: formData.ocpi_id,
        ocpi_name: formData.ocpi_name,
        ocpi_address: formData.ocpi_address,
        ocpi_city: formData.ocpi_city,
        ocpi_postal_code: formData.ocpi_postal_code,
        ocpi_country: formData.ocpi_country,
        ocpi_visible: formData.ocpi_visible,
        ocpi_facility: formData.ocpi_facility,
        ocpi_parking_restrictions: formData.ocpi_parking_restrictions,
        ocpi_directions: formData.ocpi_directions,
        ocpi_directions_en: formData.ocpi_directions_en,
      };

      const result = await saveLocation(payload);

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Location saved successfully",
        });
        onLocationSaved?.();
        if (selectedOrg) {
          const opts = await fetchLocationsByOrg(selectedOrg);
          setLocationOptions([{ value: "__NEW_LOCATION__", label: "--- Add New Location ---" }, ...opts]);
        }
        resetForm();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to save location",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        title: "Error",
        description: "Failed to save location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative z-10 bg-card rounded-2xl p-6 shadow-sm border border-border">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              onValueChange={handleLocationSelect}
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
            {loadingDetails && (
              <p className="text-xs text-muted-foreground">Loading location details...</p>
            )}
          </div>
        </div>

        {formData.location_id && (
          <div className="space-y-2">
            <Label>Location ID (Edit Mode)</Label>
            <Input value={formData.location_id} readOnly />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Location Name (EN)</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter location name in English"
            />
          </div>

          <div className="space-y-2">
            <Label>Location Name (AR)</Label>
            <Input
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              placeholder="أدخل اسم الموقع بالعربية"
              dir="rtl"
            />
          </div>
        </div>

        <MapSelector
          lat={formData.lat}
          lng={formData.lng}
          onLocationChange={(lat, lng) => setFormData({ ...formData, lat, lng })}
          disabled={!canWrite("org.name")}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Num Chargers</Label>
            <Select
              value={formData.num_chargers ? String(formData.num_chargers) : ""}
              onValueChange={(val) =>
                setFormData({ ...formData, num_chargers: val ? Number(val) : null })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select number of chargers" />
              </SelectTrigger>
              <SelectContent>
                {numChargersOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter location description"
              rows={2}
            />
          </div>
        </div>

        <LogoUpload
          currentLogoUrl={formData.logo_url}
          onUpload={async (file) => {
            const url = URL.createObjectURL(file);
            setFormData({ ...formData, logo_url: url });
          }}
          onRemove={async () => {
            setFormData({ ...formData, logo_url: "" });
          }}
          disabled={!canWrite("org.logo")}
        />

        <div className="space-y-2">
          <Label>Ad URL</Label>
          <Input
            value={formData.ad_url}
            onChange={(e) => setFormData({ ...formData, ad_url: e.target.value })}
            placeholder="https://example.com/ad.png"
            disabled={!canWrite("org.banner")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Select
              value={formData.payment_types}
              onValueChange={(val) => setFormData({ ...formData, payment_types: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                {paymentTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Availability</Label>
            <Select
              value={formData.availability}
              onValueChange={(val) => setFormData({ ...formData, availability: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select availability" />
              </SelectTrigger>
              <SelectContent>
                {availabilityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subscription</Label>
            <Select
              value={formData.subscription}
              onValueChange={(val) => setFormData({ ...formData, subscription: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subscriptionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
          <div>
            <Label className="text-base">Visible on Map</Label>
            <p className="text-sm text-muted-foreground">Show location on map for users</p>
          </div>
          <Switch
            checked={formData.visible_on_map}
            onCheckedChange={(checked) => setFormData({ ...formData, visible_on_map: checked })}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">OCPI Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OCPI ID</Label>
              <Input
                value={formData.ocpi_id}
                onChange={(e) => setFormData({ ...formData, ocpi_id: e.target.value })}
                placeholder="OCPI ID"
              />
            </div>

            <div className="space-y-2">
              <Label>OCPI Name</Label>
              <Input
                value={formData.ocpi_name}
                onChange={(e) => setFormData({ ...formData, ocpi_name: e.target.value })}
                placeholder="OCPI Name"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>OCPI Address</Label>
              <Input
                value={formData.ocpi_address}
                onChange={(e) => setFormData({ ...formData, ocpi_address: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <Label>OCPI City</Label>
              <Input
                value={formData.ocpi_city}
                onChange={(e) => setFormData({ ...formData, ocpi_city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label>OCPI Postal Code</Label>
              <Input
                value={formData.ocpi_postal_code}
                onChange={(e) => setFormData({ ...formData, ocpi_postal_code: e.target.value })}
                placeholder="Postal code"
              />
            </div>

            <div className="space-y-2">
              <Label>OCPI Country</Label>
              <Input
                value={formData.ocpi_country}
                onChange={(e) => setFormData({ ...formData, ocpi_country: e.target.value })}
                placeholder="Country code (e.g., JO)"
              />
            </div>

            <div className="space-y-2">
              <Label>OCPI Facility</Label>
              <Input
                value={formData.ocpi_facility}
                onChange={(e) => setFormData({ ...formData, ocpi_facility: e.target.value })}
                placeholder="Facility type"
              />
            </div>

            <div className="space-y-2">
              <Label>Parking Restrictions</Label>
              <Input
                value={formData.ocpi_parking_restrictions}
                onChange={(e) =>
                  setFormData({ ...formData, ocpi_parking_restrictions: e.target.value })
                }
                placeholder="Parking restrictions"
              />
            </div>

            <div className="space-y-2">
              <Label>OCPI Directions (EN)</Label>
              <Input
                value={formData.ocpi_directions_en}
                onChange={(e) => setFormData({ ...formData, ocpi_directions_en: e.target.value })}
                placeholder="Directions in English"
              />
            </div>

            <div className="space-y-2">
              <Label>OCPI Directions (AR)</Label>
              <Input
                value={formData.ocpi_directions}
                onChange={(e) => setFormData({ ...formData, ocpi_directions: e.target.value })}
                placeholder="التوجيهات بالعربية"
                dir="rtl"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl mt-4">
            <div>
              <Label className="text-base">OCPI Visible</Label>
              <p className="text-sm text-muted-foreground">Make location visible in OCPI</p>
            </div>
            <Switch
              checked={formData.ocpi_visible}
              onCheckedChange={(checked) => setFormData({ ...formData, ocpi_visible: checked })}
            />
          </div>
        </div>

        <EntityFormActions
          mode={formData.location_id ? "edit" : "create"}
          entityLabel="location"
          hasExistingEntity={Boolean(formData.location_id)}
          isSubmitting={saving}
          onDiscard={handleDiscard}
          onDelete={formData.location_id ? handleDeleteLocation : undefined}
        />
      </form>
    </div>
  );
};
