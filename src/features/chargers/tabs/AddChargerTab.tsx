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
}

export function AddChargerTab({
  activeTab,
  role,
  canRead,
  selectedCharger,
  setSelectedCharger,
  onChargerSaved,
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
  } = useChargerForm(activeTab, canRead, selectedCharger, setSelectedCharger, onChargerSaved);

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
              <AppSelect
                options={orgOptions}
                value={selectedOrg}
                onChange={setSelectedOrg}
                placeholder={isLoadingOrgs ? "Loading..." : "Select organization"}
                isDisabled={isLoadingOrgs}
              />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <AppSelect
                options={locationOptions}
                value={selectedLocation}
                onChange={setSelectedLocation}
                placeholder={isLoadingLocations ? "Loading..." : "Select location"}
                isDisabled={!selectedOrg || isLoadingLocations}
              />
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
    </PermissionGuard>
  );
}
