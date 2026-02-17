import { useCallback, useMemo, useState } from "react";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { ExportButton } from "@/components/reports/ExportButton";
import { buildCSV, downloadCSV } from "@/components/reports/exportUtils";
import {
  useSessionsReport,
  type SessionReportRow,
} from "../hooks/useSessionsReport";
import type { ReportFilterOption } from "@/components/reports/ReportFilters";

function formatDateTime(value: string): string {
  if (!value || value === "—") return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const SESSION_COLUMNS: ReportColumn<SessionReportRow>[] = [
  { key: "sessionId", header: "Session ID", sortable: true },
  { key: "charger", header: "Charger", sortable: true },
  { key: "location", header: "Location", sortable: true },
  {
    key: "startTime",
    header: "Start Time",
    sortable: true,
    render: (row) => formatDateTime(row.startTime),
  },
  { key: "energy", header: "Energy (kWh)", sortable: true },
  { key: "cost", header: "Cost", sortable: true },
];

interface SessionsReportTabProps {
  canRead?: (permission: string) => boolean;
}

export function SessionsReportTab(_props: SessionsReportTabProps) {
  const {
    filters,
    setFilters,
    rows,
    allRows,
    loading,
    error,
    handleGenerate,
    locationOptions,
    chargerOptions,
    statusOptions,
  } = useSessionsReport();

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedData = useMemo(() => {
    if (!sortKey) return rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = a[sortKey as keyof SessionReportRow] ?? "";
      const vb = b[sortKey as keyof SessionReportRow] ?? "";
      const cmp = String(va).localeCompare(String(vb), undefined, {
        numeric: true,
      });
      return dir * cmp;
    });
  }, [rows, sortKey, sortDir]);

  const handleSort = useCallback((key: string) => {
    setSortKey((k) => (k === key ? k : key));
    setSortDir((d) =>
      sortKey === key ? (d === "asc" ? "desc" : "asc") : "asc"
    );
  }, [sortKey]);

  const handleExportCSV = useCallback(() => {
    const csv = buildCSV(sortedData, SESSION_COLUMNS);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `sessions-report-${date}.csv`);
  }, [sortedData]);

  const locationFilterOptions: ReportFilterOption[] = useMemo(
    () => locationOptions.map((o) => ({ value: o.value, label: o.label })),
    [locationOptions]
  );
  const chargerFilterOptions: ReportFilterOption[] = useMemo(
    () => chargerOptions.map((o) => ({ value: o.value, label: o.label })),
    [chargerOptions]
  );

  const summary = useMemo(() => {
    const totalSessions = rows.length;
    const totalEnergy = rows.reduce(
      (sum, r) => sum + (Number(r.energy) || 0),
      0
    );
    const totalCost = rows.reduce(
      (sum, r) => sum + (Number(r.cost) || 0),
      0
    );
    return { totalSessions, totalEnergy, totalCost };
  }, [rows]);

  return (
    <div className="space-y-6">
      <ReportFilters
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        locationId={filters.locationId}
        chargerId={filters.chargerId}
        status={filters.status}
        locationOptions={locationFilterOptions}
        chargerOptions={chargerFilterOptions}
        statusOptions={statusOptions}
        onDateFromChange={(v) => setFilters((f) => ({ ...f, dateFrom: v }))}
        onDateToChange={(v) => setFilters((f) => ({ ...f, dateTo: v }))}
        onLocationChange={(v) => setFilters((f) => ({ ...f, locationId: v }))}
        onChargerChange={(v) => setFilters((f) => ({ ...f, chargerId: v }))}
        onStatusChange={(v) => setFilters((f) => ({ ...f, status: v }))}
        onApply={handleGenerate}
        applyLabel="Load sessions"
        loading={loading}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Sessions</p>
          <p className="text-xl font-bold">{summary.totalSessions}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Energy (kWh)</p>
          <p className="text-xl font-bold">
            {summary.totalEnergy.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Revenue (JOD)</p>
          <p className="text-xl font-bold">
            {summary.totalCost.toFixed(2)}
          </p>
        </div>
      </div>

      <ReportTable<SessionReportRow>
        columns={SESSION_COLUMNS}
        data={sortedData}
        loading={loading}
        error={error}
        onRetry={handleGenerate}
        emptyMessage="No sessions found. Click “Load sessions” to fetch data, or adjust filters."
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />

      <div className="flex flex-wrap gap-2">
        <ExportButton
          onClick={handleExportCSV}
          disabled={loading || sortedData.length === 0}
          label="Export CSV"
        />
      </div>
    </div>
  );
}
