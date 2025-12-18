import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { DataTable } from "@/components/shared/DataTable";
import {
  fetchChargersStatus,
  fetchChargerDetails,
  fetchChargerOrganizations,
  fetchChargersByLocation,
  fetchLocationsByOrg,
  saveCharger,
  type ChargerDetail,
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { Charger, SelectOption } from "@/types";

const tabs = [
  { id: "status", label: "Status" },
  { id: "add", label: "Add / Update Charger" },
];

const columns = [
  { key: "name" as const, header: "Name" },
  { key: "id" as const, header: "ID" },
  { key: "time" as const, header: "Time" },
];

const Chargers = () => {
  const [activeTab, setActiveTab] = useState("status");
  const [offlineChargers, setOfflineChargers] = useState<Charger[]>([]);
  const [onlineChargers, setOnlineChargers] = useState<Charger[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Form state
  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedCharger, setSelectedCharger] = useState<string>("__NEW_CHARGER__");

  const [formData, setFormData] = useState<Omit<ChargerDetail, "charger_id">>({
    name: "",
    type: "",
    status: "",
    max_session_time: undefined,
    num_connectors: undefined,
    description: "",
  });

  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingChargers, setIsLoadingChargers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingChargerDetails, setIsLoadingChargerDetails] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setStatusLoading(true);
        setStatusError(null);
        const { offline, online } = await fetchChargersStatus();
        setOfflineChargers(offline);
        setOnlineChargers(online);
      } catch (error) {
        console.error("Error loading charger status:", error);
        setStatusError("تعذر تحميل حالة الشواحن من الخادم.");
      } finally {
        setStatusLoading(false);
      }
    };

    const loadOrganizations = async () => {
      try {
        setIsLoadingOrgs(true);
        const options = await fetchChargerOrganizations();
        setOrgOptions(options);
        if (options.length > 0) {
          setSelectedOrg((prev) => prev || options[0].value);
        }
      } catch (error) {
        console.error("Error loading organizations:", error);
        toast({
          title: "خطأ في تحميل المنظمات",
          description: "تحقق من اتصال الباك نود-ريد.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingOrgs(false);
      }
    };

    loadStatus();
    loadOrganizations();
  }, []);

  useEffect(() => {
    const loadLocations = async () => {
      if (!selectedOrg) {
        setLocationOptions([]);
        setSelectedLocation("");
        return;
      }
      try {
        setIsLoadingLocations(true);
        const options = await fetchLocationsByOrg(selectedOrg);
        setLocationOptions(options);
        const first = options[0]?.value ?? "";
        setSelectedLocation((prev) => (prev ? prev : first));
      } catch (error) {
        console.error("Error loading locations:", error);
        toast({
          title: "خطأ في تحميل المواقع",
          description: "لم يتم استرجاع المواقع من الباك.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingLocations(false);
      }
    };

    loadLocations();
  }, [selectedOrg]);

  useEffect(() => {
    const loadChargers = async () => {
      if (!selectedLocation) {
        setChargerOptions([]);
        setSelectedCharger("__NEW_CHARGER__");
        return;
      }

      try {
        setIsLoadingChargers(true);
        const options = await fetchChargersByLocation(selectedLocation);
        const withNewOption: SelectOption[] = [
          { value: "__NEW_CHARGER__", label: "--- New Charger ---" },
          ...options,
        ];
        setChargerOptions(withNewOption);
        setSelectedCharger("__NEW_CHARGER__");
        resetForm();
      } catch (error) {
        console.error("Error loading chargers:", error);
        toast({
          title: "خطأ في تحميل الشواحن",
          description: "تعذر استرجاع الشواحن لهذا الموقع.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingChargers(false);
      }
    };

    loadChargers();
  }, [selectedLocation]);

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      status: "",
      max_session_time: undefined,
      num_connectors: undefined,
      description: "",
    });
    setSelectedCharger("__NEW_CHARGER__");
  };

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
          title: "لم يتم إيجاد بيانات الشاحن",
          description: "سيتم فتح نموذج إضافة جديد.",
        });
      }
    } catch (error) {
      console.error("Error loading charger details:", error);
      toast({
        title: "خطأ في تحميل بيانات الشاحن",
        description: "تعذر استرجاع التفاصيل.",
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
        title: "اختر منظمة",
        description: "يجب اختيار منظمة قبل الحفظ.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedLocation) {
      toast({
        title: "اختر موقع",
        description: "يجب اختيار موقع قبل الحفظ.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.name.trim()) {
      toast({
        title: "الاسم مطلوب",
        description: "أدخل اسم الشاحن.",
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
          title: "تم الحفظ",
          description: result.message,
        });
        setActiveTab("status");
        setStatusLoading(true);
        fetchChargersStatus()
          .then(({ offline, online }) => {
            setOfflineChargers(offline);
            setOnlineChargers(online);
          })
          .finally(() => setStatusLoading(false));
        const options = await fetchChargersByLocation(selectedLocation);
        setChargerOptions([{ value: "__NEW_CHARGER__", label: "--- New Charger ---" }, ...options]);
        setSelectedCharger("__NEW_CHARGER__");
      } else {
        toast({
          title: "لم يتم الحفظ",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving charger:", error);
      toast({
        title: "خطأ غير متوقع",
        description: "تعذر حفظ بيانات الشاحن.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const statusBreadcrumb = useMemo(() => {
    if (activeTab === "add") {
      return "ION Dashboard / Chargers / Add Charger";
    }
    return "ION Dashboard / Chargers";
  }, [activeTab]);

  const typeOptions = [
    { value: "AC", label: "AC" },
    { value: "DC", label: "DC" },
  ];

  const statusOptions = [
    { value: "online", label: "Online" },
    { value: "available", label: "Available" },
    { value: "offline", label: "Offline" },
    { value: "unavailable", label: "Unavailable" },
    { value: "error", label: "Error" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Chargers</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Monitor charger status and add new chargers
          </p>

          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">{statusBreadcrumb}</div>
        </div>

        <div className="pt-2">
          {activeTab === "status" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Offline Chargers */}
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive"></span>
                  Offline Chargers
                </h3>
                {statusError ? (
                  <p className="text-sm text-destructive">{statusError}</p>
                ) : statusLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  <DataTable
                    columns={columns}
                    data={offlineChargers}
                    searchPlaceholder="Search offline chargers"
                  />
                )}
              </div>

              {/* Online Chargers */}
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  Online Chargers
                </h3>
                {statusError ? (
                  <p className="text-sm text-destructive">{statusError}</p>
                ) : statusLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  <DataTable
                    columns={columns}
                    data={onlineChargers}
                    searchPlaceholder="Search online chargers"
                  />
                )}
              </div>
            </div>
          )}
          {activeTab === "add" && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <form className="space-y-6" onSubmit={handleSave}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Select
                      disabled={isLoadingOrgs}
                      value={selectedOrg}
                      onValueChange={(val) => setSelectedOrg(val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingOrgs ? "Loading..." : "Select organization"} />
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
                      disabled={!selectedOrg || isLoadingLocations}
                      value={selectedLocation}
                      onValueChange={(val) => setSelectedLocation(val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingLocations ? "Loading..." : "Select location"} />
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
                      disabled={!selectedLocation || isLoadingChargers}
                      value={selectedCharger}
                      onValueChange={handleSelectCharger}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingChargers ? "Loading..." : "Select charger"} />
                      </SelectTrigger>
                      <SelectContent>
                        {chargerOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isLoadingChargerDetails && (
                      <p className="text-xs text-muted-foreground">Loading charger details...</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Charger name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.type || "AC"}
                      onValueChange={(val) => setFormData({ ...formData, type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map((opt) => (
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
                      value={formData.status || "offline"}
                      onValueChange={(val) => setFormData({ ...formData, status: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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

                  <div className="space-y-2">
                    <Label>Max Session Time (min)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.max_session_time ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_session_time: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g., 120"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Connectors</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.num_connectors ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          num_connectors: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g., 2"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description ?? ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Notes about the charger"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving || isLoadingOrgs || isLoadingLocations}>
                    {isSaving
                      ? "Saving..."
                      : selectedCharger === "__NEW_CHARGER__"
                        ? "Add Charger"
                        : "Update Charger"}
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

export default Chargers;
