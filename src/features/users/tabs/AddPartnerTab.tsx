import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
              <Select
                disabled={loadingOrg}
                value={partnerForm.organization}
                onValueChange={(val) =>
                  setPartnerForm((f) => ({ ...f, organization: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingOrg ? "Loading..." : "Select organization"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(orgOptions ?? []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select
                value={String(partnerForm.role)}
                onValueChange={(val) =>
                  setPartnerForm((f) => ({ ...f, role: Number(val) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={partnerForm.language}
                onValueChange={(val) =>
                  setPartnerForm((f) => ({ ...f, language: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
