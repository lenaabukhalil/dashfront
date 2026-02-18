import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/shared/AppSelect";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePartnerForm } from "../hooks/usePartnerForm";

const roleOptions = [
  { value: 1, label: "admin" },
  { value: 2, label: "operator" },
  { value: 3, label: "accountant" },
  { value: 4, label: "manager" },
];

const languageOptions = [
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
];

interface AddPartnerTabProps {
  role: string | null;
  orgOptions: { value: string; label: string }[];
  loadingOrg: boolean;
  initialOrgValue: string;
}

export function AddPartnerTab({
  role,
  orgOptions,
  loadingOrg,
  initialOrgValue,
}: AddPartnerTabProps) {
  const {
    partnerForm,
    setPartnerForm,
    savingPartner,
    handlePartnerSubmit,
    handleCancel,
  } = usePartnerForm(initialOrgValue);

  return (
    <PermissionGuard
      role={role}
      permission="users.edit"
      action="write"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to add partner users."
          />
        </div>
      }
    >
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <form className="space-y-6" onSubmit={handlePartnerSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <AppSelect
                options={orgOptions ?? []}
                value={partnerForm.organization}
                onChange={(val) =>
                  setPartnerForm((f) => ({ ...f, organization: val }))
                }
                placeholder={loadingOrg ? "Loading..." : "Select organization"}
                isDisabled={loadingOrg}
              />
            </div>

            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                placeholder="Enter first name"
                value={partnerForm.firstName}
                onChange={(e) =>
                  setPartnerForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                placeholder="Enter last name"
                value={partnerForm.lastName}
                onChange={(e) =>
                  setPartnerForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Mobile</Label>
              <Input
                placeholder="+971 50 000 0000"
                value={partnerForm.mobile}
                onChange={(e) =>
                  setPartnerForm((f) => ({ ...f, mobile: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={partnerForm.email}
                onChange={(e) =>
                  setPartnerForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <AppSelect
                options={roleOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                value={String(partnerForm.role)}
                onChange={(val) =>
                  setPartnerForm((f) => ({ ...f, role: Number(val) }))
                }
                placeholder="Select role"
              />
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <AppSelect
                options={languageOptions}
                value={partnerForm.language}
                onChange={(val) =>
                  setPartnerForm((f) => ({ ...f, language: val }))
                }
                placeholder="Select language"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingPartner}>
              {savingPartner ? "Saving..." : "Add user"}
            </Button>
          </div>
        </form>
      </div>
    </PermissionGuard>
  );
}
