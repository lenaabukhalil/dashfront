import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/shared/AppSelect";
import { Button } from "@/components/ui/button";

export interface ReportFilterOption {
  value: string;
  label: string;
}

export interface ReportFiltersProps {
  dateFrom: string;
  dateTo: string;
  locationId: string;
  chargerId: string;
  status: string;
  locationOptions: ReportFilterOption[];
  chargerOptions: ReportFilterOption[];
  statusOptions: ReportFilterOption[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onChargerChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onApply?: () => void;
  applyLabel?: string;
  loading?: boolean;
}

export function ReportFilters({
  dateFrom,
  dateTo,
  locationId,
  chargerId,
  status,
  locationOptions,
  chargerOptions,
  statusOptions,
  onDateFromChange,
  onDateToChange,
  onLocationChange,
  onChargerChange,
  onStatusChange,
  onApply,
  applyLabel = "Apply",
  loading = false,
}: ReportFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
      <div className="space-y-2">
        <Label htmlFor="report-date-from">From date</Label>
        <Input
          id="report-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-full"
          aria-label="Filter from date"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="report-date-to">To date</Label>
        <Input
          id="report-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-full"
          aria-label="Filter to date"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="report-location">Location</Label>
        <AppSelect
          options={[{ value: "__all__", label: "All locations" }, ...locationOptions]}
          value={locationId || "__all__"}
          onChange={(v) => onLocationChange(v === "__all__" ? "" : v)}
          placeholder="All locations"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="report-charger">Charger</Label>
        <AppSelect
          options={[{ value: "__all__", label: "All chargers" }, ...chargerOptions]}
          value={chargerId || "__all__"}
          onChange={(v) => onChargerChange(v === "__all__" ? "" : v)}
          placeholder="All chargers"
        />
      </div>
      {statusOptions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="report-status">Status</Label>
          <AppSelect
            options={[{ value: "__all__", label: "All statuses" }, ...statusOptions]}
            value={status || "__all__"}
            onChange={(v) => onStatusChange(v === "__all__" ? "" : v)}
            placeholder="All statuses"
          />
        </div>
      )}
      {onApply && (
        <div className="flex items-end">
          <Button onClick={onApply} disabled={loading} aria-label={applyLabel}>
            {loading ? "Loading…" : applyLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
