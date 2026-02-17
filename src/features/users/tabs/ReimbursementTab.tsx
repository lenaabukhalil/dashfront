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
import { useReimbursementFilters } from "../hooks/useReimbursementFilters";

interface ReimbursementTabProps {
  role: string | null;
  orgOptions: { value: string; label: string }[];
  loadingOrg: boolean;
  initialOrgValue: string;
}

export function ReimbursementTab({
  role,
  orgOptions,
  loadingOrg,
  initialOrgValue,
}: ReimbursementTabProps) {
  const {
    selectedOrgForFilters,
    setSelectedOrgForFilters,
    selectedLocationForFilters,
    setSelectedLocationForFilters,
    selectedChargerForFilters,
    setSelectedChargerForFilters,
    selectedConnectorForFilters,
    setSelectedConnectorForFilters,
    locationOptions,
    chargerOptions,
    connectorOptions,
    loadingLocations,
    loadingChargers,
    loadingConnectors,
  } = useReimbursementFilters(initialOrgValue);

  return (
    <PermissionGuard
      role={role}
      permission="users.editRFID"
      action="read"
      fallback={
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <EmptyState
            title="Access Denied"
            description="You don't have permission to view reimbursement."
          />
        </div>
      }
    >
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select
              disabled={loadingOrg}
              value={selectedOrgForFilters}
              onValueChange={setSelectedOrgForFilters}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingOrg ? "Loading..." : "Select organization"}
                />
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
              disabled={!selectedOrgForFilters || loadingLocations}
              value={selectedLocationForFilters}
              onValueChange={setSelectedLocationForFilters}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingLocations ? "Loading..." : "Select location"}
                />
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
              disabled={!selectedLocationForFilters || loadingChargers}
              value={selectedChargerForFilters}
              onValueChange={setSelectedChargerForFilters}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingChargers ? "Loading..." : "Select charger"}
                />
              </SelectTrigger>
              <SelectContent>
                {chargerOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Connector</Label>
            <Select
              disabled={!selectedChargerForFilters || loadingConnectors}
              value={selectedConnectorForFilters}
              onValueChange={setSelectedConnectorForFilters}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingConnectors ? "Loading..." : "Select connector"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {connectorOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>From</Label>
            <Input type="datetime-local" />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input type="datetime-local" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline">Reset</Button>
          <Button>Generate</Button>
        </div>
      </div>
    </PermissionGuard>
  );
}
