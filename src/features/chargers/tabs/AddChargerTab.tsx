import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/shared/AppSelect";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityFormActions } from "@/components/shared/EntityFormActions";
import { useChargerForm } from "../hooks/useChargerForm";

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
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <form className="space-y-6" onSubmit={handleSave}>
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

          {wizardMode ? (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button variant="outline" type="button" onClick={onWizardBack}>
                Back
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          ) : (
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
          )}
        </form>
      </div>
    </PermissionGuard>
  );
}
