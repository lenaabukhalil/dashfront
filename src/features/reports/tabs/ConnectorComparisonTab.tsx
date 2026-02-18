import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AppSelect } from "@/components/shared/AppSelect";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportTable } from "@/components/reports/ReportTable";
import { ExportButton } from "@/components/reports/ExportButton";
import { buildCSV, downloadCSV } from "@/components/reports/exportUtils";
import {
  fetchConnectorComparison,
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  type ConnectorComparisonRow,
} from "@/services/api";
import type { SelectOption } from "@/types";
import { ChevronDown, Zap, CreditCard, Activity, Plug, Trophy, AlertTriangle } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const formatNumber = (value: number, decimals = 2) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);

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
  const [samePeriod, setSamePeriod] = useState(true);

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

  useEffect(() => {
    if (samePeriod && startA && endA) {
      setStartB(startA);
      setEndB(endA);
    }
  }, [samePeriod, startA, endA]);

  const loadReport = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const rows = await fetchConnectorComparison({
        start: start || undefined,
        end: end || undefined,
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
  }, [start, end, locationId, chargerId, selectedConnectorIds]);

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
    const useStartA = samePeriod ? startA : startA;
    const useEndA = samePeriod ? endA : endA;
    const useStartB = samePeriod ? startA : startB;
    const useEndB = samePeriod ? endA : endB;
    if (!chargerA || !connectorA || !chargerB || !connectorB) {
      setHeadError("Please select connector for both sides.");
      return;
    }
    if (!useStartA || !useEndA || !useStartB || !useEndB) {
      setHeadError("Please select date range for both sides.");
      return;
    }
    setHeadError(null);
    setHeadLoading(true);
    try {
      const [rowsA, rowsB] = await Promise.all([
        fetchConnectorComparison({
          start: useStartA,
          end: useEndA,
          chargerId: chargerA,
          connectorIds: [connectorA],
        }),
        fetchConnectorComparison({
          start: useStartB,
          end: useEndB,
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
  }, [chargerA, connectorA, chargerB, connectorB, startA, endA, startB, endB, samePeriod]);

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
    const scoreA = Math.round(((uA + rA + kA + ksA) / 4) * 100);
    const scoreB = Math.round(((uB + rB + kB + ksB) / 4) * 100);
    const typeMismatch =
      statsA.connectorType &&
      statsB.connectorType &&
      String(statsA.connectorType).toLowerCase() !== String(statsB.connectorType).toLowerCase();
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

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle>Connector Comparison</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Compare two connectors using session aggregates (sessions, total kWh, total JOD, avg per session, avg duration). Data comes from the connector-comparison API (Sessions-based SQL).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Connector A</p>
              <div className="grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className="text-xs">Organization</Label>
                  <AppSelect
                    options={orgOptions}
                    value={orgA}
                    onChange={setOrgA}
                    placeholder="Select org"
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className="text-xs">Location</Label>
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
                  <Label className="text-xs">Charger</Label>
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
                  <Label className="text-xs">Connector</Label>
                  <AppSelect
                    options={connectorOptionsA}
                    value={connectorA}
                    onChange={setConnectorA}
                    placeholder="Select connector"
                    isDisabled={connectorOptionsA.length === 0}
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className="text-xs">Start date</Label>
                  <Input type="date" className="w-full min-w-0 box-border" value={startA} onChange={(e) => setStartA(e.target.value)} />
                </div>
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className="text-xs">End date</Label>
                  <Input type="date" className="w-full min-w-0 box-border" value={endA} onChange={(e) => setEndA(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Connector B</p>
              <div className="grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className="text-xs">Organization</Label>
                  <AppSelect
                    options={orgOptions}
                    value={orgB}
                    onChange={setOrgB}
                    placeholder="Select org"
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1 min-w-0 box-border pr-2">
                  <Label className="text-xs">Location</Label>
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
                  <Label className="text-xs">Charger</Label>
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
                  <Label className="text-xs">Connector</Label>
                  <AppSelect
                    options={connectorOptionsB}
                    value={connectorB}
                    onChange={setConnectorB}
                    placeholder="Select connector"
                    isDisabled={connectorOptionsB.length === 0}
                    className="w-full min-w-0"
                  />
                </div>
                {samePeriod ? (
                  <div className="sm:col-span-2 space-y-1 min-w-0 box-border pr-2">
                    <Label className="text-xs">Date range</Label>
                    <p className="text-xs text-muted-foreground">Same as Connector A</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1 min-w-0 box-border pr-2">
                      <Label className="text-xs">Start date</Label>
                      <Input type="date" className="w-full min-w-0 box-border" value={startB} onChange={(e) => setStartB(e.target.value)} />
                    </div>
                    <div className="space-y-1 min-w-0 box-border pr-2">
                      <Label className="text-xs">End date</Label>
                      <Input type="date" className="w-full min-w-0 box-border" value={endB} onChange={(e) => setEndB(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={samePeriod}
                    onCheckedChange={(c) => setSamePeriod(c === true)}
                  />
                  <span className="text-sm text-muted-foreground">Same date range for both (fair comparison)</span>
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {samePeriod
                    ? "One date range is used for both connectors."
                    : "Tip: you can choose different time ranges for each side."}
                </p>
                <Button
                  size="sm"
                  onClick={handleHeadCompare}
                  disabled={
                    headLoading ||
                    !connectorA ||
                    !connectorB ||
                    (samePeriod ? !startA || !endA : !startA || !endA || !startB || !endB)
                  }
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
                <div className="mt-4 space-y-6">
                  <section className="rounded-xl bg-muted/20 border border-border/40 overflow-hidden">
                    <div className="p-6 sm:p-8 space-y-6">
                      {headSummary.winnerSide !== null && (
                        <div className="flex justify-center">
                          <div
                            className={cn(
                              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 border transition-all duration-200",
                              "bg-primary/10 border-primary/20 text-primary",
                              "hover:bg-primary/15 hover:border-primary/30 hover:scale-[1.02] active:scale-[0.99]"
                            )}
                          >
                            <Trophy className="h-5 w-5 shrink-0" />
                            <span className="text-sm font-bold">
                              Connector {headSummary.winnerSide} — Best performer
                            </span>
                          </div>
                        </div>
                      )}
                      {headSummary.typeMismatch && (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>Different connector types.</span>
                        </div>
                      )}
                    </div>
                  </section>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className={cn(
                      "overflow-hidden transition-shadow hover:shadow-md border-l-4",
                      headSummary.winnerSide === "A"
                        ? "border-l-primary bg-primary/10 border-primary/30 shadow-md"
                        : "border-l-muted-foreground/30"
                    )}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Connector A</CardTitle>
                        <CardDescription className="text-xs">
                          {statsA.chargerName ?? "—"} · {statsA.connectorType ?? "—"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(statsA.sessionsCount ?? 0) === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2">No sessions in this period</p>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Utilization</p>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Sessions</span><span className="font-medium tabular-nums">{statsA.sessionsCount ?? 0}</span></div>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sessions/day</span><span className="tabular-nums">{formatNumber(headSummary.sessionsPerDayA, 2)}</span></div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Revenue</p>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total (JOD)</span><span className="font-medium tabular-nums">{formatNumber(statsA.totalAmount ?? 0, 2)}</span></div>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Per day</span><span className="tabular-nums">{formatNumber(headSummary.amountPerDayA, 2)}</span></div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Energy</p>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total (kWh)</span><span className="font-medium tabular-nums">{formatNumber(statsA.totalKwh ?? 0, 2)}</span></div>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg/session (kWh)</span><span className="tabular-nums">{formatNumber((statsA.avgSessionKwh ?? headSummary.kwhPerSessionA), 2)}</span></div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Session</p>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg/session (JOD)</span><span className="tabular-nums">{formatNumber((statsA.avgSessionAmount ?? headSummary.amountPerSessionA), 2)}</span></div>
                              {(statsA.avgSessionMinutes != null && Number.isFinite(statsA.avgSessionMinutes)) && (
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg duration (min)</span><span className="tabular-nums">{formatNumber(statsA.avgSessionMinutes, 1)}</span></div>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                    <Card className={cn(
                      "overflow-hidden transition-shadow hover:shadow-md border-l-4",
                      headSummary.winnerSide === "B"
                        ? "border-l-primary bg-primary/10 border-primary/30 shadow-md"
                        : "border-l-muted-foreground/30"
                    )}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Connector B</CardTitle>
                        <CardDescription className="text-xs">
                          {statsB.chargerName ?? "—"} · {statsB.connectorType ?? "—"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(statsB.sessionsCount ?? 0) === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2">No sessions in this period</p>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Utilization</p>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Sessions</span><span className="font-medium tabular-nums">{statsB.sessionsCount ?? 0}</span></div>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sessions/day</span><span className="tabular-nums">{formatNumber(headSummary.sessionsPerDayB, 2)}</span></div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Revenue</p>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total (JOD)</span><span className="font-medium tabular-nums">{formatNumber(statsB.totalAmount ?? 0, 2)}</span></div>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Per day</span><span className="tabular-nums">{formatNumber(headSummary.amountPerDayB, 2)}</span></div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Energy</p>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total (kWh)</span><span className="font-medium tabular-nums">{formatNumber(statsB.totalKwh ?? 0, 2)}</span></div>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg/session (kWh)</span><span className="tabular-nums">{formatNumber((statsB.avgSessionKwh ?? headSummary.kwhPerSessionB), 2)}</span></div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Session</p>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg/session (JOD)</span><span className="tabular-nums">{formatNumber((statsB.avgSessionAmount ?? headSummary.amountPerSessionB), 2)}</span></div>
                              {(statsB.avgSessionMinutes != null && Number.isFinite(statsB.avgSessionMinutes)) && (
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg duration (min)</span><span className="tabular-nums">{formatNumber(statsB.avgSessionMinutes, 1)}</span></div>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
    </div>
  );
}
