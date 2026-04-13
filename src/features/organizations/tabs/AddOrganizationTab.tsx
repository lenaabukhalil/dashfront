import { EntityFormActions } from "@/components/shared/EntityFormActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/shared/AppSelect";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useOrganizationForm } from "../hooks/useOrganizationForm";
import type { Organization } from "@/types";
import { Button } from "@/components/ui/button";

interface AddOrganizationTabProps {
  organizations: Organization[];
  loading: boolean;
  refetch: () => Promise<void>;
  removeOrganizationById?: (id: string | number) => void;
  role: string | null;
  wizardMode?: boolean;
  onWizardBack?: () => void;
  onWizardSave?: (payload: { organizationId: string; organizationName: string }) => void;
}

export function AddOrganizationTab({
  organizations,
  loading,
  refetch,
  removeOrganizationById,
  role,
  wizardMode = false,
  onWizardBack,
  onWizardSave,
}: AddOrganizationTabProps) {
  const {
    selectedOrgId,
    formData,
    setFormData,
    isSubmitting,
    isLoadingOrgDetails,
    handleFormSubmit,
    handleCancel,
    handleOrgSelectChange,
    handleDelete,
  } = useOrganizationForm(organizations, loading, refetch, removeOrganizationById, onWizardSave);

  return (
    <PermissionGuard
      permission="org.name"
      action="write"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to add or edit organizations."
          />
        </div>
      }
    >
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="organization-select">
              Organization <span className="text-destructive">*</span>
            </Label>
            <AppSelect
              options={[
                { value: "__NEW_ORG__", label: "--- New Organization ---" },
                ...organizations.map((org) => ({ value: String(org.id), label: org.name })),
              ]}
              value={selectedOrgId}
              onChange={handleOrgSelectChange}
              placeholder={isLoadingOrgDetails ? "Loading..." : "Select organization"}
              isDisabled={isLoadingOrgDetails || loading}
            />
            {isLoadingOrgDetails && (
              <p className="text-xs text-muted-foreground">Loading organization details...</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter organization name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_ar">Name (Arabic)</Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="أدخل اسم المنظمة"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_first_name">Contact First Name</Label>
              <Input
                id="contact_first_name"
                value={formData.contact_first_name}
                onChange={(e) =>
                  setFormData({ ...formData, contact_first_name: e.target.value })
                }
                placeholder="Enter first name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_last_name">Contact Last Name</Label>
              <Input
                id="contact_last_name"
                value={formData.contact_last_name}
                onChange={(e) => setFormData({ ...formData, contact_last_name: e.target.value })}
                placeholder="Enter last name"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="contact_phoneNumber">Contact Phone Number</Label>
              <Input
                id="contact_phoneNumber"
                value={formData.contact_phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, contact_phoneNumber: e.target.value })
                }
                placeholder="+971 50 000 0000"
                type="tel"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="details">Details</Label>
              <Textarea
                id="details"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                placeholder="Enter organization details"
                rows={4}
              />
            </div>
          </div>

          {wizardMode ? (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button variant="outline" type="button" disabled>
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          ) : (
            <EntityFormActions
              mode={selectedOrgId === "__NEW_ORG__" ? "create" : "edit"}
              entityLabel="organization"
              hasExistingEntity={selectedOrgId !== "__NEW_ORG__"}
              isSubmitting={isSubmitting}
              onDiscard={handleCancel}
              onDelete={selectedOrgId !== "__NEW_ORG__" ? handleDelete : undefined}
            />
          )}
        </form>
      </div>
    </PermissionGuard>
  );
}
