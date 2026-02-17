import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        <Select
          value={locationId || "__all__"}
          onValueChange={(v) => onLocationChange(v === "__all__" ? "" : v)}
        >
          <SelectTrigger id="report-location" aria-label="Filter by location">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All locations</SelectItem>
            {locationOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="report-charger">Charger</Label>
        <Select
          value={chargerId || "__all__"}
          onValueChange={(v) => onChargerChange(v === "__all__" ? "" : v)}
        >
          <SelectTrigger id="report-charger" aria-label="Filter by charger">
            <SelectValue placeholder="All chargers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All chargers</SelectItem>
            {chargerOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {statusOptions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="report-status">Status</Label>
          <Select
            value={status || "__all__"}
            onValueChange={(v) => onStatusChange(v === "__all__" ? "" : v)}
          >
            <SelectTrigger id="report-status" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
