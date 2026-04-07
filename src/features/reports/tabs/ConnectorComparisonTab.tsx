import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/shared/AppSelect";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchConnectorComparison,
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  type ConnectorComparisonRow,
} from "@/services/api";
import { buildCSV, downloadCSV } from "@/components/reports/exportUtils";
import type { SelectOption } from "@/types";
import { FileText, AlertTriangle } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
/** Result cards: match reference (high precision for decimals, integers plain). */
const formatResultMetric = (value: number, opts?: { integer?: boolean }) => {
  if (opts?.integer || Number.isInteger(value)) {
    return String(Math.round(value));
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  }).format(value);
};

function ConnectorDateField({
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

function ResultMetricSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5 border-t border-[#EEEEEE] pt-4 first:border-t-0 first:pt-0 dark:border-border/80">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#757575] dark:text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

const COLUMNS: { key: keyof ConnectorComparisonRow | string; header: string; sortable?: boolean }[] = [
  { key: "connectorId", header: "Connector ID", sortable: true },
  { key: "chargerId", header: "Charger ID", sortable: true },
  { key: "chargerName", header: "Charger Name", sortable: true },
  { key: "connectorType", header: "Type", sortable: true },
  { key: "status", header: "Status", sortable: true },
  { key: "locationName", header: "Location", sortable: true },
  { key: "sessionsCount", header: "Sessions" },
  { key: "totalKwh", header: "Total kWh", sortable: true },
  { key: "totalAmount", header: "Total Amount", sortable: true },
];

export function ConnectorComparisonTab() {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);

  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);
  const [connectorOptions, setConnectorOptions] = useState<SelectOption[]>([]);

  const [organizationId, setOrganizationId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [chargerId, setChargerId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>([]);

  const [data, setData] = useState<ConnectorComparisonRow[]>([]);
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
  const [connectorOptionsA, setConnectorOptionsA] = useState<SelectOption[]>([]);
  const [connectorOptionsB, setConnectorOptionsB] = useState<SelectOption[]>([]);
  const [connectorA, setConnectorA] = useState("");
  const [connectorB, setConnectorB] = useState("");
  const [startA, setStartA] = useState("");
  const [endA, setEndA] = useState("");
  const [startB, setStartB] = useState("");
  const [endB, setEndB] = useState("");
  const [statsA, setStatsA] = useState<ConnectorComparisonRow | null>(null);
  const [statsB, setStatsB] = useState<ConnectorComparisonRow | null>(null);
  const [headLoading, setHeadLoading] = useState(false);
  const [headError, setHeadError] = useState<string | null>(null);
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
      setChargerId("");
      setConnectorOptions([]);
      setSelectedConnectorIds([]);
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
      setChargerId("");
      setConnectorOptions([]);
      setSelectedConnectorIds([]);
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
    if (!chargerId) {
      setConnectorOptions([]);
      setSelectedConnectorIds([]);
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchConnectorsByCharger(chargerId);
        setConnectorOptions(opts);
      } catch {
        setConnectorOptions([]);
      }
    };
    load();
  }, [chargerId]);

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
        if (!locA && opts.length > 0) setLocA(String(opts[0].value));
      } catch {
        setLocOptionsA([]);
      }
    };
    load();
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
        if (!locB && opts.length > 0) setLocB(String(opts[0].value));
      } catch {
        setLocOptionsB([]);
      }
    };
    load();
  }, [orgB]);

  useEffect(() => {
    if (!locA) {
      setChargerOptionsA([]);
      setChargerA("");
      setConnectorOptionsA([]);
      setConnectorA("");
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchChargersByLocation(locA);
        setChargerOptionsA(opts);
        if (!chargerA && opts.length > 0) setChargerA(String(opts[0].value));
      } catch {
        setChargerOptionsA([]);
      }
    };
    load();
  }, [locA]);

  useEffect(() => {
    if (!locB) {
      setChargerOptionsB([]);
      setChargerB("");
      setConnectorOptionsB([]);
      setConnectorB("");
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchChargersByLocation(locB);
        setChargerOptionsB(opts);
        if (!chargerB && opts.length > 0) setChargerB(String(opts[0].value));
      } catch {
        setChargerOptionsB([]);
      }
    };
    load();
  }, [locB]);

  useEffect(() => {
    if (!chargerA) {
      setConnectorOptionsA([]);
      setConnectorA("");
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchConnectorsByCharger(chargerA);
        setConnectorOptionsA(opts);
        if (!connectorA && opts.length > 0) setConnectorA(String(opts[0].value));
      } catch {
        setConnectorOptionsA([]);
      }
    };
    load();
  }, [chargerA]);

  useEffect(() => {
    if (!chargerB) {
      setConnectorOptionsB([]);
      setConnectorB("");
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchConnectorsByCharger(chargerB);
        setConnectorOptionsB(opts);
        if (!connectorB && opts.length > 0) setConnectorB(String(opts[0].value));
      } catch {
        setConnectorOptionsB([]);
      }
    };
    load();
  }, [chargerB]);

  const loadReport = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const rows = await fetchConnectorComparison({
        start: start || undefined,
        end: end || undefined,
        organizationId: organizationId || undefined,
        locationId: locationId || undefined,
        chargerId: chargerId || undefined,
        connectorIds: selectedConnectorIds.length > 0 ? selectedConnectorIds : undefined,
      });
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [start, end, organizationId, locationId, chargerId, selectedConnectorIds]);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = a[sortKey as keyof ConnectorComparisonRow];
      const vb = b[sortKey as keyof ConnectorComparisonRow];
      if (va == null && vb == null) return 0;
      if (va == null) return dir;
      if (vb == null) return -dir;
      if (typeof va === "number" && typeof vb === "number") return dir * (va - vb);
      return dir * String(va).localeCompare(String(vb), undefined, { numeric: true });
    });
  }, [data, sortKey, sortDir]);

  const summary = useMemo(() => {
    const sessions = sortedData.reduce((s, r) => s + (r.sessionsCount ?? 0), 0);
    const kwh = sortedData.reduce((s, r) => s + (r.totalKwh ?? 0), 0);
    const amount = sortedData.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
    return {
      connectors: sortedData.length,
      sessions,
      kwh,
      amount,
    };
  }, [sortedData]);

  const handleSort = useCallback((key: string) => {
    setSortKey((k) => (k === key ? k : key));
    setSortDir((d) => (sortKey === key ? (d === "asc" ? "desc" : "asc") : "desc"));
  }, [sortKey]);

  const handleExportCSV = useCallback(() => {
    const csv = buildCSV(sortedData, COLUMNS);
    downloadCSV(csv, `connector-comparison-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [sortedData]);

  const toggleConnector = useCallback((value: string, checked: boolean) => {
    setSelectedConnectorIds((prev) =>
      checked ? [...prev, value] : prev.filter((id) => id !== value)
    );
  }, []);

  const handleHeadCompare = useCallback(async () => {
    if (!chargerA || !connectorA || !chargerB || !connectorB) {
      setHeadError("Please select connector for both sides.");
      return;
    }
    if (!startA || !endA || !startB || !endB) {
      setHeadError("Please select date range for both sides.");
      return;
    }
    setHeadError(null);
    setHeadLoading(true);
    try {
      const [rowsA, rowsB] = await Promise.all([
        fetchConnectorComparison({
          start: startA,
          end: endA,
          organizationId: orgA || undefined,
          chargerId: chargerA,
          connectorIds: [connectorA],
        }),
        fetchConnectorComparison({
          start: startB,
          end: endB,
          organizationId: orgB || undefined,
          chargerId: chargerB,
          connectorIds: [connectorB],
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
  }, [chargerA, connectorA, chargerB, connectorB, orgA, orgB, startA, endA, startB, endB]);

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
    const sessionsA = statsA.sessionsCount ?? 0;
    const sessionsB = statsB.sessionsCount ?? 0;
    const kwhA = statsA.totalKwh ?? 0;
    const kwhB = statsB.totalKwh ?? 0;
    const amountA = statsA.totalAmount ?? 0;
    const amountB = statsB.totalAmount ?? 0;
    const sessionsPerDayA = daysA > 0 ? sessionsA / daysA : 0;
    const sessionsPerDayB = daysB > 0 ? sessionsB / daysB : 0;
    const kwhPerDayA = daysA > 0 ? kwhA / daysA : 0;
    const kwhPerDayB = daysB > 0 ? kwhB / daysB : 0;
    const amountPerDayA = daysA > 0 ? amountA / daysA : 0;
    const amountPerDayB = daysB > 0 ? amountB / daysB : 0;
    const kwhPerSessionA = sessionsA ? kwhA / sessionsA : 0;
    const kwhPerSessionB = sessionsB ? kwhB / sessionsB : 0;
    const norm = (a: number, b: number) => {
      const max = Math.max(a, b);
      if (!max || !isFinite(max)) return [0, 0] as const;
      return [a / max, b / max] as const;
    };
    const [uA, uB] = norm(sessionsPerDayA, sessionsPerDayB);
    const [rA, rB] = norm(amountPerDayA, amountPerDayB);
    const [kA, kB] = norm(kwhPerDayA, kwhPerDayB);
    const [ksA, ksB] = norm(kwhPerSessionA, kwhPerSessionB);
    const compositeA = (uA + rA + kA + ksA) / 4;
    const compositeB = (uB + rB + kB + ksB) / 4;
    const scoreA = Math.round(compositeA * 100);
    const scoreB = Math.round(compositeB * 100);
    const typeMismatch =
      statsA.connectorType &&
      statsB.connectorType &&
      String(statsA.connectorType).toLowerCase() !== String(statsB.connectorType).toLowerCase();
    // Compare raw composite scores so ties after rounding still resolve (match reference: always pick a winner when data differs).
    const eps = 1e-9;
    let winnerSide: "A" | "B" | null = null;
    if (compositeA > compositeB + eps) winnerSide = "A";
    else if (compositeB > compositeA + eps) winnerSide = "B";
    else if (Math.abs(compositeA - compositeB) <= eps) {
      if (sessionsA !== sessionsB) winnerSide = sessionsA > sessionsB ? "A" : "B";
      else if (amountA !== amountB) winnerSide = amountA > amountB ? "A" : "B";
      else if (kwhA !== kwhB) winnerSide = kwhA > kwhB ? "A" : "B";
    }
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
      amountPerSessionA: sessionsA ? amountA / sessionsA : 0,
      amountPerSessionB: sessionsB ? amountB / sessionsB : 0,
      scoreA,
      scoreB,
      winnerSide,
      typeMismatch,
    };
  }, [statsA, statsB, startA, endA, startB, endB]);

  const columnsWithRender = useMemo(
    () =>
      COLUMNS.map((col) => {
        if (col.key === "totalKwh")
          return {
            ...col,
            render: (row: ConnectorComparisonRow) => {
              const v = row.totalKwh ?? 0;
              return v % 1 ? v.toFixed(2) : String(v);
            },
          };
        if (col.key === "totalAmount")
          return {
            ...col,
            render: (row: ConnectorComparisonRow) => {
              const v = row.totalAmount ?? 0;
              return v % 1 ? v.toFixed(2) : String(v);
            },
          };
        return col;
      }),
    []
  );

  const panelClass =
    "space-y-4 rounded-xl border border-[#90CAF9]/55 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-primary/35 dark:bg-card";
  const formLabelClass = "text-xs font-medium text-[#616161] dark:text-muted-foreground";
  const metricRowClass = "flex justify-between gap-4 text-sm";
  const metricLabelClass = "font-normal text-[#757575] dark:text-muted-foreground";
  const metricValueClass =
    "font-bold tabular-nums text-[#212121] text-right shrink-0 dark:text-foreground";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex gap-3 min-w-0">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
          <div className="space-y-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              Connector Comparison
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Select two connectors and date ranges. Compare utilization, revenue, and energy at a glance
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={panelClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1976D2] dark:text-primary">
                Connector A
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className={formLabelClass}>Organization</Label>
                  <AppSelect
                    options={orgOptions}
                    value={orgA}
                    onChange={setOrgA}
                    placeholder="Select org"
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className={formLabelClass}>Location</Label>
                  <AppSelect
                    options={locOptionsA}
                    value={locA}
                    onChange={setLocA}
                    placeholder="All"
                    isDisabled={!orgA || locOptionsA.length === 0}
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className={formLabelClass}>Charger</Label>
                  <AppSelect
                    options={chargerOptionsA}
                    value={chargerA}
                    onChange={setChargerA}
                    placeholder="Select charger"
                    isDisabled={chargerOptionsA.length === 0}
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className={formLabelClass}>Connector</Label>
                  <AppSelect
                    options={connectorOptionsA}
                    value={connectorA}
                    onChange={setConnectorA}
                    placeholder="Select connector"
                    isDisabled={connectorOptionsA.length === 0}
                    className="w-full min-w-0"
                  />
                </div>
                <ConnectorDateField
                  id="connector-a-start"
                  label="Start date"
                  value={startA}
                  onChange={setStartA}
                />
                <ConnectorDateField
                  id="connector-a-end"
                  label="End date"
                  value={endA}
                  onChange={setEndA}
                />
              </div>
            </div>
            <div className={panelClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1976D2] dark:text-primary">
                Connector B
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className={formLabelClass}>Organization</Label>
                  <AppSelect
                    options={orgOptions}
                    value={orgB}
                    onChange={setOrgB}
                    placeholder="Select org"
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className={formLabelClass}>Location</Label>
                  <AppSelect
                    options={locOptionsB}
                    value={locB}
                    onChange={setLocB}
                    placeholder="All"
                    isDisabled={!orgB || locOptionsB.length === 0}
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className={formLabelClass}>Charger</Label>
                  <AppSelect
                    options={chargerOptionsB}
                    value={chargerB}
                    onChange={setChargerB}
                    placeholder="Select charger"
                    isDisabled={chargerOptionsB.length === 0}
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className={formLabelClass}>Connector</Label>
                  <AppSelect
                    options={connectorOptionsB}
                    value={connectorB}
                    onChange={setConnectorB}
                    placeholder="Select connector"
                    isDisabled={connectorOptionsB.length === 0}
                    className="w-full min-w-0"
                  />
                </div>
                <ConnectorDateField
                  id="connector-b-start"
                  label="Start date"
                  value={startB}
                  onChange={setStartB}
                />
                <ConnectorDateField
                  id="connector-b-end"
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
                    !connectorA ||
                    !connectorB ||
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
              {!headLoading && statsA && statsB && headSummary && (
                <div className="mt-6 space-y-5 border-t border-[#EEEEEE] pt-6 dark:border-border/80">
                  <p className="text-center text-xs text-[#757575] dark:text-muted-foreground">
                    Different orgs, locations, or time ranges are supported.
                  </p>
                  <div className="flex w-full justify-center px-2">
                    {headSummary.winnerSide !== null ? (
                      <p
                        className="text-center text-base font-bold leading-snug text-[#2E7D32] dark:text-[#66BB6A]"
                        role="status"
                      >
                        Connector {headSummary.winnerSide} — Best performer
                      </p>
                    ) : (
                      <p
                        className="text-center text-sm font-medium text-[#757575] dark:text-muted-foreground"
                        role="status"
                      >
                        Tie — equal performance
                      </p>
                    )}
                  </div>
                  {headSummary.typeMismatch && (
                    <div className="flex items-center justify-center gap-2 px-2 text-center text-xs font-medium text-[#B8860B] dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>Different connector types — compare with care.</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                    <div className="rounded-xl border border-[#E0E0E0] bg-white p-5 shadow-sm dark:border-border dark:bg-card">
                      <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#EEEEEE] pb-4 dark:border-border/80">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-[#212121] dark:text-foreground">
                            Connector A
                          </h3>
                          <p className="mt-1 text-sm text-[#757575] dark:text-muted-foreground">
                            {statsA.chargerName ?? "—"} — {statsA.connectorType ?? "—"}
                          </p>
                        </div>
                        {statsA.status ? (
                          <span className="shrink-0 rounded-full bg-[#EEEEEE] px-2.5 py-0.5 text-xs font-medium lowercase text-[#616161] dark:bg-muted dark:text-muted-foreground">
                            {String(statsA.status).toLowerCase()}
                          </span>
                        ) : null}
                      </div>
                      {(statsA.sessionsCount ?? 0) === 0 ? (
                        <p className="py-2 text-sm italic text-[#757575] dark:text-muted-foreground">
                          No sessions in this period
                        </p>
                      ) : (
                        <div className="space-y-0">
                          <ResultMetricSection title="Utilization">
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Total Sessions</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(statsA.sessionsCount ?? 0, { integer: true })}
                              </span>
                            </div>
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Sessions/day</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(headSummary.sessionsPerDayA)}
                              </span>
                            </div>
                          </ResultMetricSection>
                          <ResultMetricSection title="Revenue">
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Total (JOD)</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(statsA.totalAmount ?? 0)}
                              </span>
                            </div>
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Per day</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(headSummary.amountPerDayA)}
                              </span>
                            </div>
                          </ResultMetricSection>
                          <ResultMetricSection title="Energy">
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Total (kWh)</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(statsA.totalKwh ?? 0)}
                              </span>
                            </div>
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Avg/session (kWh)</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(
                                  statsA.avgSessionKwh ?? headSummary.kwhPerSessionA
                                )}
                              </span>
                            </div>
                          </ResultMetricSection>
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl border border-[#E0E0E0] bg-white p-5 shadow-sm dark:border-border dark:bg-card">
                      <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#EEEEEE] pb-4 dark:border-border/80">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-[#212121] dark:text-foreground">
                            Connector B
                          </h3>
                          <p className="mt-1 text-sm text-[#757575] dark:text-muted-foreground">
                            {statsB.chargerName ?? "—"} — {statsB.connectorType ?? "—"}
                          </p>
                        </div>
                        {statsB.status ? (
                          <span className="shrink-0 rounded-full bg-[#EEEEEE] px-2.5 py-0.5 text-xs font-medium lowercase text-[#616161] dark:bg-muted dark:text-muted-foreground">
                            {String(statsB.status).toLowerCase()}
                          </span>
                        ) : null}
                      </div>
                      {(statsB.sessionsCount ?? 0) === 0 ? (
                        <p className="py-2 text-sm italic text-[#757575] dark:text-muted-foreground">
                          No sessions in this period
                        </p>
                      ) : (
                        <div className="space-y-0">
                          <ResultMetricSection title="Utilization">
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Total Sessions</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(statsB.sessionsCount ?? 0, { integer: true })}
                              </span>
                            </div>
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Sessions/day</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(headSummary.sessionsPerDayB)}
                              </span>
                            </div>
                          </ResultMetricSection>
                          <ResultMetricSection title="Revenue">
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Total (JOD)</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(statsB.totalAmount ?? 0)}
                              </span>
                            </div>
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Per day</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(headSummary.amountPerDayB)}
                              </span>
                            </div>
                          </ResultMetricSection>
                          <ResultMetricSection title="Energy">
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Total (kWh)</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(statsB.totalKwh ?? 0)}
                              </span>
                            </div>
                            <div className={metricRowClass}>
                              <span className={metricLabelClass}>Avg/session (kWh)</span>
                              <span className={metricValueClass}>
                                {formatResultMetric(
                                  statsB.avgSessionKwh ?? headSummary.kwhPerSessionB
                                )}
                              </span>
                            </div>
                          </ResultMetricSection>
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
