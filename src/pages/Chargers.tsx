import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { DataTable } from "@/components/shared/DataTable";
import {
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
import type { SelectOption } from "@/types";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { RemoteControl } from "@/components/operations/RemoteControl";
import { ChargingLimits } from "@/components/operations/ChargingLimits";
import { SchedulingPanel } from "@/components/operations/SchedulingPanel";
import { fetchChargersStatus } from "@/services/api";
import type { Charger } from "@/types";

const tabs = [
  { id: "status", label: "Status" },
  { id: "add", label: "Chargers" },
  { id: "control", label: "Remote Control" },
  { id: "limits", label: "Charging Limits" },
  { id: "schedule", label: "Schedule" },
];

const Chargers = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead, canWrite } = usePermission(role);
  
  const [activeTab, setActiveTab] = useState("status");

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

  // Status tab state
  const [offlineChargers, setOfflineChargers] = useState<Charger[]>([]);
  const [onlineChargers, setOnlineChargers] = useState<Charger[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusSearchOffline, setStatusSearchOffline] = useState("");
  const [statusSearchOnline, setStatusSearchOnline] = useState("");

  useEffect(() => {
    // Only load if user has read permission and we're on the add tab
    if (!canRead("charger.chargerStatus") || activeTab !== "add") {
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
    // Only load if we're on the add tab
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
    // Only load if we're on the add tab
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
  }, [selectedLocation, activeTab]);

  // Load charger status for Status tab
  useEffect(() => {
    if (activeTab !== "status" || !canRead("charger.chargerStatus")) {
      return;
    }

    const loadStatus = async () => {
      try {
        setIsLoadingStatus(true);
        const status = await fetchChargersStatus();
        setOfflineChargers(status.offline || []);
        setOnlineChargers(status.online || []);
      } catch (error) {
        console.error("Error loading charger status:", error);
        toast({
          title: "Failed to load charger status",
          description: "Could not retrieve charger status.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingStatus(false);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [activeTab, canRead]);

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

  const breadcrumb = useMemo(() => "ION Dashboard / Chargers", []);

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

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">{breadcrumb}</div>
        </div>

        <div className="pt-2">
          {activeTab === "status" && (
            <PermissionGuard 
              role={role} 
              permission="charger.chargerStatus" 
              action="read"
              fallback={
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to view charger status."
                  />
                </div>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Offline Chargers */}
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <div className="mb-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-red-700 shadow-sm ring-1 ring-red-100">
                        <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]" />
                        <span className="text-sm font-semibold tracking-tight">Offline</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="Search"
                        value={statusSearchOffline}
                        onChange={(e) => setStatusSearchOffline(e.target.value)}
                        className="pl-8"
                      />
                      <svg
                        className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  {isLoadingStatus ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : (
                    <DataTable
                      data={offlineChargers.filter((c) =>
                        c.name.toLowerCase().includes(statusSearchOffline.toLowerCase()) ||
                        c.id.toLowerCase().includes(statusSearchOffline.toLowerCase())
                      )}
                      columns={[
                        {
                          key: "name",
                          header: "Name",
                          render: (row) => row.name,
                        },
                        {
                          key: "id",
                          header: "ID",
                          render: (row) => row.id,
                        },
                        {
                          key: "time",
                          header: "Time",
                          render: (row) => {
                            if (!row.time) return "N/A";
                            try {
                              return new Date(row.time).toLocaleString();
                            } catch {
                              return row.time;
                            }
                          },
                        },
                      ]}
                      showSearch={false}
                    />
                  )}
                </div>

                {/* Online Chargers */}
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <div className="mb-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
                        <span className="text-sm font-semibold tracking-tight">Online</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="Search"
                        value={statusSearchOnline}
                        onChange={(e) => setStatusSearchOnline(e.target.value)}
                        className="pl-8"
                      />
                      <svg
                        className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  {isLoadingStatus ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : (
                    <DataTable
                      data={onlineChargers.filter((c) =>
                        c.name.toLowerCase().includes(statusSearchOnline.toLowerCase()) ||
                        c.id.toLowerCase().includes(statusSearchOnline.toLowerCase())
                      )}
                      columns={[
                        {
                          key: "name",
                          header: "Name",
                          render: (row) => row.name,
                        },
                        {
                          key: "id",
                          header: "ID",
                          render: (row) => row.id,
                        },
                        {
                          key: "time",
                          header: "Time",
                          render: (row) => {
                            if (!row.time) return "N/A";
                            try {
                              return new Date(row.time).toLocaleString();
                            } catch {
                              return row.time;
                            }
                          },
                        },
                      ]}
                      showSearch={false}
                    />
                  )}
                </div>
              </div>
            </PermissionGuard>
          )}

          {activeTab === "add" && (
            <PermissionGuard 
              role={role} 
              permission="charger.chargerStatus" 
              action="read"
              fallback={
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to view chargers."
                  />
                </div>
              }
            >
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

                  <PermissionGuard role={role} permission="charger.enableDisableCharger" action="write">
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
                  </PermissionGuard>

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

                <PermissionGuard role={role} permission="charger.chargerStatus" action="write">
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving || isLoadingOrgs || isLoadingLocations}>
                      {isSaving ? "Saving..." : "Add / Update Charger"}
                    </Button>
                  </div>
                </PermissionGuard>
              </form>
              </div>
            </PermissionGuard>
          )}

          {activeTab === "control" && (
            <PermissionGuard
              role={role}
              permission="charger.chargerControl"
              action="write"
              fallback={
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to control chargers."
                  />
                </div>
              }
            >
              <RemoteControl />
            </PermissionGuard>
          )}

          {activeTab === "limits" && (
            <PermissionGuard
              role={role}
              permission="charger.chargerControl"
              action="write"
              fallback={
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to set charging limits."
                  />
                </div>
              }
            >
              <ChargingLimits chargerId={selectedCharger !== "__NEW_CHARGER__" ? selectedCharger : undefined} />
            </PermissionGuard>
          )}

          {activeTab === "schedule" && (
            <PermissionGuard
              role={role}
              permission="charger.schedule"
              action="read"
              fallback={
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to view schedules."
                  />
                </div>
              }
            >
              <SchedulingPanel chargerId={selectedCharger !== "__NEW_CHARGER__" ? selectedCharger : undefined} />
            </PermissionGuard>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chargers;
