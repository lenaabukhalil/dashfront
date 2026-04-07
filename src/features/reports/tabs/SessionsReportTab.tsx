import { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/shared/AppSelect";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { formatDateTime } from "@/lib/formatDateTime";
import { ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionsReport, type SessionsReportTableRow } from "../hooks/useSessionsReport";

const SESSIONS_COLUMNS: ReportColumn<SessionsReportTableRow>[] = [
  {
    key: "startDateTime",
    header: "Start Date/Time",
    render: (row) => formatDateTime(row.startDateTime),
  },
  { key: "sessionId", header: "Session ID" },
  { key: "location", header: "Location" },
  { key: "charger", header: "Charger" },
  { key: "connector", header: "Connector" },
  {
    key: "energyKwh",
    header: "Energy (KWH)",
    render: (row) => (Number.isFinite(row.energyKwh) ? row.energyKwh.toFixed(2) : "—"),
  },
  {
    key: "amountJod",
    header: "Amount (JOD)",
    render: (row) => (Number.isFinite(row.amountJod) ? row.amountJod.toFixed(2) : "—"),
  },
  { key: "mobile", header: "Mobile" },
];

function clampHour(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(23, Math.max(0, Math.trunc(n)));
}

function clampMinute(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(59, Math.max(0, Math.trunc(n)));
}

function padTime(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "00";
  return String(n).padStart(2, "0");
}

/** Hour/minute spinners inside the bordered box (HH : MM label sits beside From/To, above this row) */
const timeSegmentInputClass =
  "h-8 w-8 min-w-8 border-0 bg-transparent p-0 text-center text-sm font-medium tabular-nums shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:h-3 [&::-webkit-inner-spin-button]:opacity-80 [&::-webkit-outer-spin-button]:h-3 [&::-webkit-outer-spin-button]:opacity-80";

function DateTimeFilterGroup({
  label,
  dateId,
  dateValue,
  onDateChange,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: {
  label: string;
  dateId: string;
  dateValue: string;
  onDateChange: (v: string) => void;
  hour: string;
  minute: string;
  onHourChange: (v: string) => void;
  onMinuteChange: (v: string) => void;
}) {
  const timeHintId = `${dateId}-time-hint`;

  return (
    <div className="w-fit max-w-full min-w-0 space-y-1.5">
      {/* Same column widths as bordered row: date (130px) | divider | time — HH/MM above spinners */}
      <div className="flex w-full min-w-0 flex-row flex-nowrap items-center">
        <div className="flex w-[130px] shrink-0 items-center">
          <Label htmlFor={dateId} className="leading-none">
            {label}
          </Label>
        </div>
        <div className="w-px shrink-0 self-stretch min-h-[0.875rem] bg-transparent" aria-hidden />
        <div
          id={timeHintId}
          className="flex min-w-[5.5rem] shrink-0 flex-row flex-nowrap items-center justify-center gap-0.5 px-2 text-[10px] font-medium leading-none tracking-wide text-muted-foreground"
        >
          <span className="inline-block w-8 min-w-8 text-center">HH</span>
          <span className="shrink-0 px-0.5 select-none" aria-hidden>
            :
          </span>
          <span className="inline-block w-8 min-w-8 text-center">MM</span>
        </div>
      </div>
      {/* Single bordered box: compact date | hour + minute */}
      <div
        className={cn(
          "flex w-fit max-w-full min-w-0 flex-row flex-nowrap items-stretch overflow-hidden rounded-md border border-input bg-muted/40 shadow-sm",
          "transition-[color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/35 focus-within:ring-offset-2 focus-within:ring-offset-background",
        )}
      >
        <Input
          id={dateId}
          type="date"
          className={cn(
            "h-10 min-h-10 w-[130px] max-w-[130px] flex-none shrink-0 self-center rounded-none border-0 bg-transparent px-2 py-0 shadow-none",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
          )}
          value={dateValue}
          onChange={(e) => onDateChange(e.target.value)}
        />
        <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
        <div
          className="flex min-w-[5.5rem] shrink-0 flex-row flex-nowrap items-center justify-center gap-0.5 px-2"
          role="group"
          aria-labelledby={timeHintId}
        >
          <Input
            type="number"
            min={0}
            max={23}
            step={1}
            inputMode="numeric"
            className={timeSegmentInputClass}
            value={hour === "" ? "" : Number(hour)}
            aria-label={`${label} hour`}
            onChange={(e) => onHourChange(String(clampHour(Number(e.target.value))))}
            onBlur={() => onHourChange(padTime(hour || "0"))}
          />
          <span className="shrink-0 px-0.5 text-sm font-bold leading-none text-foreground select-none" aria-hidden>
            :
          </span>
          <Input
            type="number"
            min={0}
            max={59}
            step={1}
            inputMode="numeric"
            className={timeSegmentInputClass}
            value={minute === "" ? "" : Number(minute)}
            aria-label={`${label} minute`}
            onChange={(e) => onMinuteChange(String(clampMinute(Number(e.target.value))))}
            onBlur={() => onMinuteChange(padTime(minute || "0"))}
          />
        </div>
      </div>
    </div>
  );
}

export function SessionsReportTab() {
  const {
    filters,
    setFilters,
    locationOptions,
    chargerOptions,
    connectorOptions,
    organizations,
    selectedOrgId,
    setSelectedOrgId,
    locations,
    selectedLocationId,
    setSelectedLocationId,
    chargers,
    selectedChargerId,
    setSelectedChargerId,
    connectors,
    selectedConnectorId,
    setSelectedConnectorId,
    rows,
    loading,
    error,
    hasLoaded,
    loadSessions,
    clearFilters,
    exportCsv,
    perPage,
    onPerPageChange,
    setDateOrder,
  } = useSessionsReport();

  const onPageSizeChange = useCallback(
    (nextSize: number) => {
      onPerPageChange(nextSize);
    },
    [onPerPageChange],
  );

  const organizationSelectOptions = useMemo(
    () => [{ value: "", label: "All organizations" }, ...organizations.map((o) => ({ value: String(o.id), label: o.name }))],
    [organizations],
  );
  const locationSelectOptions = useMemo(
    () => [{ value: "", label: "All locations" }, ...locations.map((loc) => ({ value: String(loc.location_id), label: loc.name }))],
    [locations],
  );
  const chargerSelectOptions = useMemo(
    () => [{ value: "", label: "All chargers" }, ...chargers.map((c) => ({ value: String(c.charger_id), label: c.name || String(c.charger_id) }))],
    [chargers],
  );
  const connectorSelectOptions = useMemo(
    () => [{ value: "", label: "All connectors" }, ...connectors.map((c) => ({ value: String(c.connector_id), label: c.connector_type }))],
    [connectors],
  );

  const emptyMessage = hasLoaded
    ? "No sessions found for the selected filters"
    : "Select filters and click Load sessions to view results";

  return (
    <Card className="rounded-xl border border-border/80 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Sessions report</CardTitle>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-primary border-primary/40" onClick={() => void exportCsv()}>
          <ArrowDownToLine className="h-4 w-4" />
          CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="shrink-0">
              <DateTimeFilterGroup
                label="From"
                dateId="sr-from-date"
                dateValue={filters.fromDate}
                onDateChange={(v) => setFilters((f) => ({ ...f, fromDate: v }))}
                hour={filters.fromHour}
                minute={filters.fromMinute}
                onHourChange={(v) => setFilters((f) => ({ ...f, fromHour: v }))}
                onMinuteChange={(v) => setFilters((f) => ({ ...f, fromMinute: v }))}
              />
            </div>
            <div className="shrink-0">
              <DateTimeFilterGroup
                label="To"
                dateId="sr-to-date"
                dateValue={filters.toDate}
                onDateChange={(v) => setFilters((f) => ({ ...f, toDate: v }))}
                hour={filters.toHour}
                minute={filters.toMinute}
                onHourChange={(v) => setFilters((f) => ({ ...f, toHour: v }))}
                onMinuteChange={(v) => setFilters((f) => ({ ...f, toMinute: v }))}
              />
            </div>
            <div className="min-w-0 w-full shrink-0 space-y-1.5 sm:w-56">
              <Label>Organization</Label>
              <AppSelect
                options={organizationSelectOptions}
                value={selectedOrgId}
                onChange={(v) => setSelectedOrgId(v)}
                placeholder="All organizations"
                className="w-full"
              />
            </div>
            <div className="min-w-0 w-full shrink-0 space-y-1.5 sm:w-56">
              <Label>Location</Label>
              <AppSelect
                options={locationSelectOptions}
                value={selectedLocationId}
                onChange={(v) => setSelectedLocationId(v)}
                placeholder="All locations"
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 w-full shrink-0 space-y-1.5 sm:w-56">
              <Label>Charger</Label>
              <AppSelect
                options={chargerSelectOptions}
                value={selectedChargerId}
                onChange={(v) => setSelectedChargerId(v)}
                isDisabled={selectedLocationId === ""}
                placeholder="All chargers"
                className="w-full"
              />
            </div>
            <div className="min-w-0 w-full shrink-0 space-y-1.5 sm:w-56">
              <Label>Connectors</Label>
              <AppSelect
                options={connectorSelectOptions}
                value={selectedConnectorId}
                onChange={(v) => setSelectedConnectorId(v)}
                isDisabled={selectedChargerId === ""}
                placeholder="All connectors"
                className="w-full"
              />
            </div>
            <div className="min-w-0 w-full shrink-0 space-y-1.5 sm:w-56">
              <Label>Energy (KWH)</Label>
              <div className="flex w-full min-w-0 items-center gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Min"
                  className="h-10 min-w-0 flex-1 bg-muted/40"
                  value={filters.energyMin}
                  onChange={(e) => setFilters((f) => ({ ...f, energyMin: e.target.value }))}
                />
                <span className="shrink-0 text-muted-foreground">—</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Max"
                  className="h-10 min-w-0 flex-1 bg-muted/40"
                  value={filters.energyMax}
                  onChange={(e) => setFilters((f) => ({ ...f, energyMax: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-end gap-2">
              <div className="flex rounded-md border border-input overflow-hidden shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none px-3 h-10",
                    filters.dateOrder === "desc" ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "rounded-none",
                  )}
                  onClick={() => setDateOrder("desc")}
                >
                  Newest first
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none px-3 h-10 border-l border-input",
                    filters.dateOrder === "asc" ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "rounded-none",
                  )}
                  onClick={() => setDateOrder("asc")}
                >
                  Oldest first
                </Button>
              </div>
              <Button type="button" className="h-10 px-5" onClick={loadSessions} disabled={loading}>
                Load sessions
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 px-5 border-primary text-primary hover:bg-primary/10"
                onClick={() => {
                  setSelectedOrgId("");
                  clearFilters();
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        </div>

        <ReportTable<SessionsReportTableRow>
          columns={SESSIONS_COLUMNS}
          data={rows}
          loading={loading}
          error={error}
          onRetry={loadSessions}
          emptyMessage={emptyMessage}
          pageSize={perPage}
          onPageSizeChange={onPageSizeChange}
        />
      </CardContent>
    </Card>
  );
}
