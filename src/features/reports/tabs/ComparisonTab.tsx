import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { buildCSV, downloadCSV } from "@/components/reports/exportUtils";
import {
  fetchChargerComparison,
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  type ChargerComparisonRow,
} from "@/services/api";
import type { SelectOption } from "@/types";
import { ChevronDown, AlertTriangle, BarChart3, FileText } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const COLUMNS: { key: keyof ChargerComparisonRow | string; header: string; sortable?: boolean }[] = [
  { key: "chargerId", header: "Charger ID", sortable: true },
  { key: "name", header: "Name", sortable: true },
  { key: "type", header: "Type", sortable: true },
  { key: "status", header: "Status", sortable: true },
  { key: "locationName", header: "Location", sortable: true },
  { key: "connectorsCount", header: "Connectors", sortable: true },
  { key: "onlineFlag", header: "Online", sortable: true },
  { key: "sessionsCount", header: "Sessions", sortable: true },
  { key: "totalKwh", header: "Total kWh", sortable: true },
  { key: "totalAmount", header: "Total Amount", sortable: true },
];

/** Result card metrics: integers plain, decimals up to 7 places (matches reference UI). */
const formatResultMetric = (value: number, opts?: { integer?: boolean }) => {
  if (opts?.integer || Number.isInteger(value)) {
    return String(Math.round(value));
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  }).format(value);
};

function ComparisonResultSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5 border-t border-[#EEEEEE] pt-4 first:border-t-0 first:pt-0 dark:border-border/80">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#757575] dark:text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function ComparisonMetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="font-normal text-[#757575] dark:text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums text-[#212121] text-right shrink-0 dark:text-foreground">
        {value}
      </span>
    </div>
  );
}

function ChargerDateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5 min-w-0 box-border pr-2">
      <Label
        htmlFor={id}
        className="text-xs font-medium text-[#616161] dark:text-muted-foreground"
      >
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full min-w-0 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#1976D2]/35 dark:border-border dark:bg-background [&::-webkit-calendar-picker-indicator]:opacity-100"
      />
    </div>
  );
}

const panelClass =
  "space-y-4 rounded-xl border border-[#90CAF9]/55 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-primary/35 dark:bg-card";
const formLabelClass = "text-xs font-medium text-[#616161] dark:text-muted-foreground";

function NativeReportSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1 min-w-0 box-border pr-2">
      <Label htmlFor={id} className={formLabelClass}>
        {label}
      </Label>
      <div className="relative">
        <select
          id={id}
          className="h-10 w-full min-w-0 appearance-none rounded-lg border border-[#E0E0E0] bg-white py-0 pl-3 pr-9 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1976D2]/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-background"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#757575] dark:text-muted-foreground"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function ComparisonTab() {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);

  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);

  const [organizationId, setOrganizationId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selectedChargerIds, setSelectedChargerIds] = useState<string[]>([]);

  const [data, setData] = useState<ChargerComparisonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [sortKey, setSortKey] = useState<string | null>("sessionsCount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const [orgA, setOrgA] = useState("");
  const [orgB, setOrgB] = useState("");
  const [locOptionsA, setLocOptionsA] = useState<SelectOption[]>([]);
  const [locOptionsB, setLocOptionsB] = useState<SelectOption[]>([]);
  const [locA, setLocA] = useState("");
  const [locB, setLocB] = useState("");
  const [chargerOptionsA, setChargerOptionsA] = useState<SelectOption[]>([]);
  const [chargerOptionsB, setChargerOptionsB] = useState<SelectOption[]>([]);
  const [chargerA, setChargerA] = useState("");
  const [chargerB, setChargerB] = useState("");
  const [startA, setStartA] = useState("");
  const [endA, setEndA] = useState("");
  const [startB, setStartB] = useState("");
  const [endB, setEndB] = useState("");
  const [statsA, setStatsA] = useState<ChargerComparisonRow | null>(null);
  const [statsB, setStatsB] = useState<ChargerComparisonRow | null>(null);
  const [headLoading, setHeadLoading] = useState(false);
  const [headError, setHeadError] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<"util" | "revenuePerDay" | "kwhPerDay" | "kwhPerSession">("util");

  useEffect(() => {
    if (!canRead?.("finance.reports")) return;
    const load = async () => {
      try {
        const opts = await fetchChargerOrganizations();
        setOrgOptions(opts);
        if (opts.length > 0 && !organizationId) setOrganizationId(opts[0].value);
      } catch {
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load orgs only when canRead changes
  }, [canRead]);

  useEffect(() => {
    if (!organizationId) {
      setLocationOptions([]);
      setLocationId("");
      setChargerOptions([]);
      setSelectedChargerIds([]);
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchLocationsByOrg(organizationId);
        setLocationOptions(opts);
        if (opts.length > 0 && !locationId) setLocationId(opts[0].value);
      } catch {
        setLocationOptions([]);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load locations only when organizationId changes
  }, [organizationId]);

  useEffect(() => {
    if (!locationId) {
      setChargerOptions([]);
      setSelectedChargerIds([]);
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchChargersByLocation(locationId);
        setChargerOptions(opts);
      } catch {
        setChargerOptions([]);
      }
    };
    load();
  }, [locationId]);

  useEffect(() => {
    if (!orgA) {
      setLocOptionsA([]);
      setLocA("");
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchLocationsByOrg(orgA);
        setLocOptionsA(opts);
        if (!locA && opts.length > 0) {
          setLocA(String(opts[0].value));
        }
      } catch {
        setLocOptionsA([]);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgA]);

  useEffect(() => {
    if (!orgB) {
      setLocOptionsB([]);
      setLocB("");
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchLocationsByOrg(orgB);
        setLocOptionsB(opts);
        if (!locB && opts.length > 0) {
          setLocB(String(opts[0].value));
        }
      } catch {
        setLocOptionsB([]);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgB]);

  useEffect(() => {
    if (!locA) {
      setChargerOptionsA([]);
      setChargerA("");
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchChargersByLocation(locA);
        setChargerOptionsA(opts);
        if (!chargerA && opts.length > 0) {
          setChargerA(String(opts[0].value));
        }
      } catch {
        setChargerOptionsA([]);
      }
    };
    load();
  }, [locA, chargerA]);

  useEffect(() => {
    if (!locB) {
      setChargerOptionsB([]);
      setChargerB("");
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchChargersByLocation(locB);
        setChargerOptionsB(opts);
        if (!chargerB && opts.length > 0) {
          setChargerB(String(opts[0].value));
        }
      } catch {
        setChargerOptionsB([]);
      }
    };
    load();
  }, [locB, chargerB]);

  const loadReport = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const rows = await fetchChargerComparison({
        start: start || undefined,
        end: end || undefined,
        organizationId: organizationId || undefined,
        locationId: locationId || undefined,
        chargerIds: selectedChargerIds.length > 0 ? selectedChargerIds : undefined,
      });
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [start, end, organizationId, locationId, selectedChargerIds]);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = a[sortKey as keyof ChargerComparisonRow];
      const vb = b[sortKey as keyof ChargerComparisonRow];
      if (va == null && vb == null) return 0;
      if (va == null) return dir;
      if (vb == null) return -dir;
      if (typeof va === "boolean" && typeof vb === "boolean") return dir * (va === vb ? 0 : va ? 1 : -1);
      if (typeof va === "number" && typeof vb === "number") return dir * (va - vb);
      return dir * String(va).localeCompare(String(vb), undefined, { numeric: true });
    });
  }, [data, sortKey, sortDir]);

  const summary = useMemo(() => {
    const sessions = sortedData.reduce((s, r) => s + (r.sessionsCount ?? 0), 0);
    const kwh = sortedData.reduce((s, r) => s + (r.totalKwh ?? 0), 0);
    const amount = sortedData.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
    const online = sortedData.filter((r) => r.onlineFlag === true).length;
    return {
      chargers: sortedData.length,
      sessions,
      kwh,
      amount,
      online,
    };
  }, [sortedData]);

  const handleSort = useCallback((key: string) => {
    setSortKey((k) => (k === key ? k : key));
    setSortDir((d) => (sortKey === key ? (d === "asc" ? "desc" : "asc") : "desc"));
  }, [sortKey]);

  const handleExportCSV = useCallback(() => {
    const csv = buildCSV(
      sortedData.map((r) => ({
        ...r,
        onlineFlag: r.onlineFlag ? "Yes" : "No",
      })),
      COLUMNS
    );
    downloadCSV(csv, `charger-comparison-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [sortedData]);

  const toggleCharger = useCallback((value: string, checked: boolean) => {
    setSelectedChargerIds((prev) =>
      checked ? [...prev, value] : prev.filter((id) => id !== value)
    );
  }, []);

  const handleHeadCompare = useCallback(async () => {
    if (!chargerA || !chargerB || !startA || !endA || !startB || !endB) {
      setHeadError("Please select charger and date range for both sides.");
      return;
    }
    setHeadError(null);
    setHeadLoading(true);
    try {
      const [rowsA, rowsB] = await Promise.all([
        fetchChargerComparison({
          start: startA,
          end: endA,
          organizationId: orgA || undefined,
          chargerIds: [chargerA],
        }),
        fetchChargerComparison({
          start: startB,
          end: endB,
          organizationId: orgB || undefined,
          chargerIds: [chargerB],
        }),
      ]);
      setStatsA(rowsA[0] ?? null);
      setStatsB(rowsB[0] ?? null);
    } catch (e) {
      setStatsA(null);
      setStatsB(null);
      setHeadError(e instanceof Error ? e.message : String(e));
    } finally {
      setHeadLoading(false);
    }
  }, [chargerA, chargerB, orgA, orgB, startA, endA, startB, endB, locA, locB]);

  const headSummary = useMemo(() => {
    if (!statsA || !statsB || !startA || !endA || !startB || !endB) return null;

    const getDays = (startDate: string, endDate: string) => {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
      const diffMs = e.getTime() - s.getTime();
      const days = diffMs / (1000 * 60 * 60 * 24) + 1;
      return Math.max(1, Math.round(days));
    };

    const daysA = getDays(startA, endA);
    const daysB = getDays(startB, endB);
    const daysForPerDay = 30;

    const sessionsA = statsA.sessionsCount ?? 0;
    const sessionsB = statsB.sessionsCount ?? 0;
    const kwhA = statsA.totalKwh ?? 0;
    const kwhB = statsB.totalKwh ?? 0;
    const amountA = statsA.totalAmount ?? 0;
    const amountB = statsB.totalAmount ?? 0;

    const sessionsPerDayA = sessionsA / daysForPerDay;
    const sessionsPerDayB = sessionsB / daysForPerDay;
    const kwhPerDayA = kwhA / daysForPerDay;
    const kwhPerDayB = kwhB / daysForPerDay;
    const amountPerDayA = amountA / daysForPerDay;
    const amountPerDayB = amountB / daysForPerDay;
    const kwhPerSessionA = sessionsA ? kwhA / sessionsA : 0;
    const kwhPerSessionB = sessionsB ? kwhB / sessionsB : 0;
    const amountPerSessionA = sessionsA ? amountA / sessionsA : 0;
    const amountPerSessionB = sessionsB ? amountB / sessionsB : 0;
    const norm = (a: number, b: number) => {
      const max = Math.max(a, b);
      if (!max || !isFinite(max)) return [0, 0] as const;
      return [a / max, b / max] as const;
    };
    const [uA, uB] = norm(sessionsPerDayA, sessionsPerDayB);
    const [rA, rB] = norm(amountPerDayA, amountPerDayB);
    const [kA, kB] = norm(kwhPerDayA, kwhPerDayB);
    const [ksA, ksB] = norm(kwhPerSessionA, kwhPerSessionB);
    const scoreA = Math.round(((uA + rA + kA + ksA) / 4) * 100);
    const scoreB = Math.round(((uB + rB + kB + ksB) / 4) * 100);
    const typeMismatch =
      statsA.type && statsB.type && String(statsA.type).toLowerCase() !== String(statsB.type).toLowerCase();
    const scoreGap = Math.abs(scoreA - scoreB);
    const loserScore = scoreA >= scoreB ? scoreB : scoreA;
    const relativeAdvantagePercent =
      loserScore > 0 && scoreGap > 0 ? Math.round((scoreGap / loserScore) * 100) : 0;
    const winnerSide = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null;
    return {
      daysA,
      daysB,
      sessionsPerDayA,
      sessionsPerDayB,
      kwhPerDayA,
      kwhPerDayB,
      amountPerDayA,
      amountPerDayB,
      kwhPerSessionA,
      kwhPerSessionB,
      amountPerSessionA,
      amountPerSessionB,
      scoreA,
      scoreB,
      scoreGap,
      relativeAdvantagePercent,
      winnerSide,
      typeMismatch,
    };
  }, [statsA, statsB, startA, endA, startB, endB]);

  const columnsWithRender = useMemo(
    () =>
      COLUMNS.map((col) => {
        if (col.key === "onlineFlag")
          return {
            ...col,
            render: (row: ChargerComparisonRow) => (row.onlineFlag ? "Yes" : "No"),
          };
        if (col.key === "totalKwh")
          return {
            ...col,
            render: (row: ChargerComparisonRow) => {
              const v = row.totalKwh ?? 0;
              return v % 1 ? v.toFixed(2) : String(v);
            },
          };
        if (col.key === "totalAmount")
          return {
            ...col,
            render: (row: ChargerComparisonRow) => {
              const v = row.totalAmount ?? 0;
              return v % 1 ? v.toFixed(2) : String(v);
            },
          };
        return col;
      }),
    []
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex gap-3 min-w-0">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
          <div className="space-y-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground tracking-tight">Charger Comparison</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Select two chargers and date ranges. Compare utilization, revenue, and energy at a glance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={panelClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1976D2] dark:text-primary">
              Charger A
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
              <NativeReportSelect
                id="charger-a-org"
                label="Organization"
                value={orgA}
                onChange={setOrgA}
                options={orgOptions}
                placeholder="Select org"
              />
              <NativeReportSelect
                id="charger-a-location"
                label="Location"
                value={locA}
                onChange={setLocA}
                options={locOptionsA}
                placeholder="All"
                disabled={!orgA || locOptionsA.length === 0}
              />
              <div className="min-w-0 sm:col-span-2">
                <NativeReportSelect
                  id="charger-a-charger"
                  label="Charger"
                  value={chargerA}
                  onChange={setChargerA}
                  options={chargerOptionsA}
                  placeholder="Select charger"
                  disabled={chargerOptionsA.length === 0}
                />
              </div>
              <ChargerDateField
                id="charger-a-start"
                label="Start date"
                value={startA}
                onChange={setStartA}
              />
              <ChargerDateField
                id="charger-a-end"
                label="End date"
                value={endA}
                onChange={setEndA}
              />
            </div>
          </div>

          <div className={panelClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1976D2] dark:text-primary">
              Charger B
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
              <NativeReportSelect
                id="charger-b-org"
                label="Organization"
                value={orgB}
                onChange={setOrgB}
                options={orgOptions}
                placeholder="Select org"
              />
              <NativeReportSelect
                id="charger-b-location"
                label="Location"
                value={locB}
                onChange={setLocB}
                options={locOptionsB}
                placeholder="All"
                disabled={!orgB || locOptionsB.length === 0}
              />
              <div className="min-w-0 sm:col-span-2">
                <NativeReportSelect
                  id="charger-b-charger"
                  label="Charger"
                  value={chargerB}
                  onChange={setChargerB}
                  options={chargerOptionsB}
                  placeholder="Select charger"
                  disabled={chargerOptionsB.length === 0}
                />
              </div>
              <ChargerDateField
                id="charger-b-start"
                label="Start date"
                value={startB}
                onChange={setStartB}
              />
              <ChargerDateField
                id="charger-b-end"
                label="End date"
                value={endB}
                onChange={setEndB}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-xs text-[#757575] dark:text-muted-foreground">
            Different orgs, locations, or time ranges are supported.
          </p>
          <Button
            size="sm"
            onClick={handleHeadCompare}
            disabled={
              headLoading ||
              !chargerA ||
              !chargerB ||
              !startA ||
              !endA ||
              !startB ||
              !endB
            }
            className="rounded-lg bg-[#1976D2] px-5 text-white shadow-sm hover:bg-[#1565C0] dark:bg-primary dark:hover:bg-primary/90"
          >
            {headLoading ? "Comparing…" : "Compare A vs B"}
          </Button>
        </div>

        {headError && <p className="text-xs text-destructive">{headError}</p>}

        {headLoading && (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        )}

              {!headLoading && !statsA && !statsB && !headError && (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 px-6 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No comparison yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Select Charger A and Charger B with date ranges, then click Compare A vs B to see performance side by side.
                  </p>
                </div>
              )}

              {!headLoading && statsA && statsB && headSummary && (
                <div className="mt-6 space-y-5 animate-in fade-in duration-200">
                  {headSummary.winnerSide !== null && (
                    <p
                      className="text-center text-base font-semibold text-[#2E7D32] dark:text-[#66BB6A]"
                      role="status"
                    >
                      Charger {headSummary.winnerSide} — Best performer
                    </p>
                  )}
                  {headSummary.typeMismatch && (
                    <div className="flex items-center justify-center gap-2 px-2 text-center text-xs font-medium text-[#B8860B] dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>Different charger types — compare with care.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                    <div className="rounded-xl border border-[#E0E0E0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-border dark:bg-card dark:shadow-none">
                      <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#EEEEEE] pb-4 dark:border-border/80">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-[#212121] dark:text-foreground">Charger A</h3>
                          <p className="mt-1 text-sm text-[#757575] dark:text-muted-foreground">
                            {statsA.name} — {statsA.type ?? "—"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium lowercase",
                            statsA.onlineFlag
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-300"
                              : "border border-[#E0E0E0] bg-[#F5F5F5] text-[#616161] dark:border-border dark:bg-muted dark:text-muted-foreground"
                          )}
                        >
                          {statsA.onlineFlag
                            ? String(statsA.status ?? "online")
                                .trim()
                                .toLowerCase() || "online"
                            : String(statsA.status ?? "offline")
                                .trim()
                                .toLowerCase() || "offline"}
                        </span>
                      </div>
                      {(statsA.sessionsCount ?? 0) === 0 ? (
                        <p className="py-2 text-sm italic text-[#757575] dark:text-muted-foreground">
                          No sessions in this period
                        </p>
                      ) : (
                        <div className="space-y-0">
                          <ComparisonResultSection title="Utilization">
                            <ComparisonMetricRow
                              label="Total Sessions"
                              value={formatResultMetric(statsA.sessionsCount ?? 0, { integer: true })}
                            />
                            <ComparisonMetricRow
                              label="Sessions/day"
                              value={formatResultMetric(headSummary.sessionsPerDayA)}
                            />
                          </ComparisonResultSection>
                          <ComparisonResultSection title="Revenue">
                            <ComparisonMetricRow
                              label="Total (JOD)"
                              value={formatResultMetric(statsA.totalAmount ?? 0)}
                            />
                            <ComparisonMetricRow
                              label="Per day"
                              value={formatResultMetric(headSummary.amountPerDayA)}
                            />
                          </ComparisonResultSection>
                          <ComparisonResultSection title="Energy">
                            <ComparisonMetricRow
                              label="Total (kWh)"
                              value={formatResultMetric(statsA.totalKwh ?? 0)}
                            />
                            <ComparisonMetricRow
                              label="Per session (kWh)"
                              value={formatResultMetric(headSummary.kwhPerSessionA)}
                            />
                          </ComparisonResultSection>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-[#E0E0E0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-border dark:bg-card dark:shadow-none">
                      <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#EEEEEE] pb-4 dark:border-border/80">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-[#212121] dark:text-foreground">Charger B</h3>
                          <p className="mt-1 text-sm text-[#757575] dark:text-muted-foreground">
                            {statsB.name} — {statsB.type ?? "—"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium lowercase",
                            statsB.onlineFlag
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-300"
                              : "border border-[#E0E0E0] bg-[#F5F5F5] text-[#616161] dark:border-border dark:bg-muted dark:text-muted-foreground"
                          )}
                        >
                          {statsB.onlineFlag
                            ? String(statsB.status ?? "online")
                                .trim()
                                .toLowerCase() || "online"
                            : String(statsB.status ?? "offline")
                                .trim()
                                .toLowerCase() || "offline"}
                        </span>
                      </div>
                      {(statsB.sessionsCount ?? 0) === 0 ? (
                        <p className="py-2 text-sm italic text-[#757575] dark:text-muted-foreground">
                          No sessions in this period
                        </p>
                      ) : (
                        <div className="space-y-0">
                          <ComparisonResultSection title="Utilization">
                            <ComparisonMetricRow
                              label="Total Sessions"
                              value={formatResultMetric(statsB.sessionsCount ?? 0, { integer: true })}
                            />
                            <ComparisonMetricRow
                              label="Sessions/day"
                              value={formatResultMetric(headSummary.sessionsPerDayB)}
                            />
                          </ComparisonResultSection>
                          <ComparisonResultSection title="Revenue">
                            <ComparisonMetricRow
                              label="Total (JOD)"
                              value={formatResultMetric(statsB.totalAmount ?? 0)}
                            />
                            <ComparisonMetricRow
                              label="Per day"
                              value={formatResultMetric(headSummary.amountPerDayB)}
                            />
                          </ComparisonResultSection>
                          <ComparisonResultSection title="Energy">
                            <ComparisonMetricRow
                              label="Total (kWh)"
                              value={formatResultMetric(statsB.totalKwh ?? 0)}
                            />
                            <ComparisonMetricRow
                              label="Per session (kWh)"
                              value={formatResultMetric(headSummary.kwhPerSessionB)}
                            />
                          </ComparisonResultSection>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
      </div>
    </div>
  );
}
