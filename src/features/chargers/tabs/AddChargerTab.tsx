import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/shared/AppSelect";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityFormActions } from "@/components/shared/EntityFormActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChargerForm } from "../hooks/useChargerForm";
import { fetchChargersByLocation, saveCharger } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption } from "@/types";
import type { ChargerFormData } from "../hooks/useChargerForm";

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

const ocpiStatusOptions = [
  { value: "", label: "— Not set —" },
  { value: "AVAILABLE", label: "AVAILABLE" },
  { value: "BLOCKED", label: "BLOCKED" },
  { value: "CHARGING", label: "CHARGING" },
  { value: "INOPERATIVE", label: "INOPERATIVE" },
  { value: "OUTOFORDER", label: "OUTOFORDER" },
  { value: "PLANNED", label: "PLANNED" },
  { value: "REMOVED", label: "REMOVED" },
  { value: "RESERVED", label: "RESERVED" },
  { value: "UNKNOWN", label: "UNKNOWN" },
];

interface AddChargerTabProps {
  activeTab: string;
  role: string | null;
  canRead: (permission: string) => boolean;
  selectedCharger: string;
  setSelectedCharger: (v: string) => void;
  onChargerSaved?: () => void;
  wizardMode?: boolean;
  prefilledOrgId?: string;
  prefilledLocationId?: string;
  onWizardBack?: () => void;
  onWizardSave?: (payload: { chargerId: string; chargerName: string }) => void;
}

export function AddChargerTab({
  activeTab,
  role,
  canRead,
  selectedCharger,
  setSelectedCharger,
  onChargerSaved,
  wizardMode = false,
  prefilledOrgId,
  prefilledLocationId,
  onWizardBack,
  onWizardSave,
}: AddChargerTabProps) {
  const {
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
  } = useChargerForm(
    activeTab,
    canRead,
    selectedCharger,
    setSelectedCharger,
    onChargerSaved,
    prefilledOrgId,
    prefilledLocationId,
    onWizardSave
  );

  const [wizardSubMode, setWizardSubMode] = useState<"existing" | "new">("existing");
  const [existingChargersList, setExistingChargersList] = useState<SelectOption[]>([]);
  const [existingChargersLoading, setExistingChargersLoading] = useState(false);
  const [chargerDrafts, setChargerDrafts] = useState<ChargerFormData[]>([]);
  const [wizardBatchSaving, setWizardBatchSaving] = useState(false);

  useEffect(() => {
    if (wizardMode) setWizardSubMode("existing");
  }, [wizardMode, prefilledLocationId]);

  useEffect(() => {
    if (!wizardMode || !prefilledLocationId) {
      setExistingChargersList([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setExistingChargersLoading(true);
      try {
        const list = await fetchChargersByLocation(prefilledLocationId);
        if (!cancelled) setExistingChargersList(list);
      } catch {
        if (!cancelled) setExistingChargersList([]);
      } finally {
        if (!cancelled) setExistingChargersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wizardMode, prefilledLocationId]);

  const typeLabel = (t: string) => typeOptions.find((o) => o.value === t)?.label || t || "—";
  const statusLabel = (s: string) => statusOptions.find((o) => o.value === s)?.label || s || "—";

  const effectiveLocationId = prefilledLocationId || selectedLocation;

  const addChargerDraft = () => {
    if (!selectedOrg) {
      toast({
        title: "Select an organization",
        description: "You must select an organization before adding a charger.",
        variant: "destructive",
      });
      return;
    }
    if (!effectiveLocationId) {
      toast({
        title: "Select a location",
        description: "You must select a location before adding a charger.",
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
    setChargerDrafts((prev) => [...prev, { ...formData }]);
    resetForm();
  };

  const saveAllChargerDrafts = async () => {
    if (!onWizardSave) return;
    if (!effectiveLocationId) {
      toast({
        title: "Select a location",
        description: "Location is required to save chargers.",
        variant: "destructive",
      });
      return;
    }
    const formHasData = Boolean(formData.name.trim());
    const queue = formHasData ? [...chargerDrafts, { ...formData }] : [...chargerDrafts];
    if (queue.length === 0) {
      toast({
        title: "No drafted chargers",
        description: "Add at least one charger to the draft list, or use the Existing Chargers tab.",
        variant: "destructive",
      });
      return;
    }
    if (formHasData) {
      if (!selectedOrg) {
        toast({
          title: "Select an organization",
          description: "You must select an organization before saving chargers.",
          variant: "destructive",
        });
        return;
      }
    }
    setWizardBatchSaving(true);
    try {
      let lastId = "";
      let lastName = "";
      for (const draft of queue) {
        const result = await saveCharger({
          locationId: effectiveLocationId,
          name: draft.name,
          type: draft.type || "AC",
          status: draft.status || "offline",
          maxSessionTime: draft.max_session_time,
          numConnectors: draft.num_connectors,
          description: draft.description,
          enabled: draft.enabled,
          available: draft.available,
          isGAM: draft.isGAM,
          ion_fees_id: draft.ion_fees_id,
          prompt_id: draft.prompt_id,
          ocpi_uid: draft.ocpi_uid,
          ocpi_id: draft.ocpi_id,
          ocpi_status: draft.ocpi_status,
          ocpi_directions: draft.ocpi_directions,
          ocpi_directions_en: draft.ocpi_directions_en,
        });
        if (!result.success) {
          toast({
            title: "Not saved",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        const options = await fetchChargersByLocation(effectiveLocationId);
        const resolved =
          result.chargerId ||
          options.find((o) => o.label.trim().toLowerCase() === draft.name.trim().toLowerCase())?.value ||
          options[options.length - 1]?.value;
        if (!resolved) {
          toast({
            title: "Error",
            description: "Charger saved but could not resolve charger ID.",
            variant: "destructive",
          });
          return;
        }
        lastId = resolved;
        lastName = draft.name.trim() || "Charger";
      }
      setChargerDrafts([]);
      if (formHasData) resetForm();
      onWizardSave({ chargerId: lastId, chargerName: lastName });
    } catch (e) {
      console.error(e);
      toast({
        title: "Unexpected error",
        description: "Could not save chargers.",
        variant: "destructive",
      });
    } finally {
      setWizardBatchSaving(false);
    }
  };

  const hideChargerSelect = wizardMode && wizardSubMode === "new";

  const chargerFormFields = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Organization</Label>
          {wizardMode && prefilledOrgId ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {orgOptions.find((o) => o.value === selectedOrg)?.label ?? selectedOrg}
            </div>
          ) : (
            <AppSelect
              options={orgOptions}
              value={selectedOrg}
              onChange={setSelectedOrg}
              placeholder={isLoadingOrgs ? "Loading..." : "Select organization"}
              isDisabled={isLoadingOrgs}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          {wizardMode && prefilledLocationId ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {locationOptions.find((o) => o.value === selectedLocation)?.label ?? selectedLocation}
            </div>
          ) : (
            <AppSelect
              options={locationOptions}
              value={selectedLocation}
              onChange={setSelectedLocation}
              placeholder={isLoadingLocations ? "Loading..." : "Select location"}
              isDisabled={!selectedOrg || isLoadingLocations}
            />
          )}
        </div>

        {!hideChargerSelect ? (
          <div className="space-y-2">
            <Label>Charger</Label>
            <AppSelect
              options={chargerOptions}
              value={selectedCharger}
              onChange={handleSelectCharger}
              placeholder={isLoadingChargers ? "Loading..." : "Select charger"}
              isDisabled={!selectedLocation || isLoadingChargers}
            />
            {isLoadingChargerDetails && (
              <p className="text-xs text-muted-foreground">Loading charger details...</p>
            )}
          </div>
        ) : null}
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
          <AppSelect
            options={typeOptions}
            value={formData.type || "AC"}
            onChange={(val) => setFormData({ ...formData, type: val })}
            placeholder="Type"
          />
        </div>

        <PermissionGuard role={role} permission="charger.enableDisableCharger" action="write">
          <div className="space-y-2">
            <Label>Status</Label>
            <AppSelect
              options={statusOptions}
              value={formData.status || "offline"}
              onChange={(val) => setFormData({ ...formData, status: val })}
              placeholder="Status"
            />
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

      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2 border-b pb-1">
        Charger Flags
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData((prev) => ({ ...prev, enabled: e.target.checked }))}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Enabled</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.available}
            onChange={(e) => setFormData((prev) => ({ ...prev, available: e.target.checked }))}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Available</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isGAM}
            onChange={(e) => setFormData((prev) => ({ ...prev, isGAM: e.target.checked }))}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Is GAM</span>
        </label>
      </div>

      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2 border-b pb-1">
        Advanced Settings
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ion Fees ID</Label>
          <Input
            type="number"
            value={formData.ion_fees_id ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                ion_fees_id: e.target.value ? Number(e.target.value) : null,
              }))
            }
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label>Prompt ID</Label>
          <Input
            type="number"
            value={formData.prompt_id ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                prompt_id: e.target.value ? Number(e.target.value) : null,
              }))
            }
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2 border-b pb-1">
        OCPI Settings
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>OCPI UID</Label>
          <Input
            value={formData.ocpi_uid}
            onChange={(e) => setFormData((prev) => ({ ...prev, ocpi_uid: e.target.value }))}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label>OCPI ID</Label>
          <Input
            value={formData.ocpi_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, ocpi_id: e.target.value }))}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>OCPI Status</Label>
          <AppSelect
            options={ocpiStatusOptions}
            value={formData.ocpi_status}
            onChange={(val) => setFormData((prev) => ({ ...prev, ocpi_status: val }))}
            placeholder="— Not set —"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>OCPI Directions (AR)</Label>
          <Input
            value={formData.ocpi_directions}
            onChange={(e) => setFormData((prev) => ({ ...prev, ocpi_directions: e.target.value }))}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>OCPI Directions (EN)</Label>
          <Input
            value={formData.ocpi_directions_en}
            onChange={(e) => setFormData((prev) => ({ ...prev, ocpi_directions_en: e.target.value }))}
            placeholder="Optional"
          />
        </div>
      </div>
    </>
  );

  return (
    <PermissionGuard
      role={role}
      permission="charger.status"
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
      {wizardMode ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chargers</CardTitle>
            <CardDescription>
              Review existing chargers or add a new charger for this location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="inline-flex rounded-lg border border-border bg-muted/20 p-1">
              <button
                type="button"
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  wizardSubMode === "existing"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setWizardSubMode("existing");
                  setChargerDrafts([]);
                }}
              >
                Existing Chargers
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  wizardSubMode === "new"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setWizardSubMode("new");
                  setChargerDrafts([]);
                  resetForm();
                  setSelectedCharger("__NEW_CHARGER__");
                }}
              >
                Add New Charger
              </button>
            </div>

            {wizardSubMode === "existing" ? (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Existing Chargers at This Location</h4>
                  {!prefilledLocationId ? (
                    <p className="text-sm text-muted-foreground">Complete the location step first.</p>
                  ) : existingChargersLoading ? (
                    <p className="text-sm text-muted-foreground">Loading existing chargers...</p>
                  ) : existingChargersList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No existing chargers found.</p>
                  ) : (
                    existingChargersList.map((ch) => (
                      <button
                        key={ch.value}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/30"
                        onClick={() =>
                          void onWizardSave?.({ chargerId: ch.value, chargerName: ch.label })
                        }
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{ch.label}</div>
                          <div className="text-xs text-muted-foreground truncate">ID: {ch.value}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary">Charger</Badge>
                          <Badge variant="outline" className="tabular-nums">
                            {ch.value}
                          </Badge>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <Button variant="outline" type="button" onClick={onWizardBack}>
                    Back
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {chargerFormFields}
                <p className="text-sm text-muted-foreground mb-2">
                  Add another charger, or click <strong>Save & Continue</strong> to proceed.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={addChargerDraft}
                    disabled={
                      wizardBatchSaving ||
                      isSaving ||
                      isLoadingOrgs ||
                      isLoadingLocations ||
                      !effectiveLocationId
                    }
                  >
                    Add New Charger
                  </Button>
                </div>
                {chargerDrafts.length > 0 ? (
                  <div className="space-y-2">
                    {chargerDrafts.map((d, idx) => (
                      <div
                        key={`${d.name}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{d.name.trim() || "—"}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {statusLabel(d.status || "offline")}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {d.num_connectors != null ? `${d.num_connectors} connector(s)` : "—"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary">{typeLabel(d.type || "AC")}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No drafted chargers yet.</p>
                )}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <Button variant="outline" type="button" onClick={onWizardBack} disabled={wizardBatchSaving}>
                    Back
                  </Button>
                  <Button type="button" disabled={wizardBatchSaving} onClick={() => void saveAllChargerDrafts()}>
                    {wizardBatchSaving ? "Saving..." : "Save & Continue"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <form className="space-y-6" onSubmit={handleSave}>
            {chargerFormFields}
            <PermissionGuard role={role} permission="charger.status" action="write">
              <EntityFormActions
                mode={selectedCharger === "__NEW_CHARGER__" ? "create" : "edit"}
                entityLabel="charger"
                hasExistingEntity={selectedCharger !== "__NEW_CHARGER__"}
                isSubmitting={isSaving}
                onDiscard={resetForm}
                onDelete={selectedCharger !== "__NEW_CHARGER__" ? handleDeleteCharger : undefined}
              />
            </PermissionGuard>
          </form>
        </div>
      )}
    </PermissionGuard>
  );
}
