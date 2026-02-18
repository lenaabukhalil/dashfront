import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportTable } from "@/components/reports/ReportTable";
import { ExportButton } from "@/components/reports/ExportButton";
import { buildCSV, downloadCSV } from "@/components/reports/exportUtils";
import {
  fetchChargerComparison,
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  type ChargerComparisonRow,
} from "@/services/api";
import type { SelectOption } from "@/types";
import {
  ChevronDown,
  LayoutGrid,
  List,
  Zap,
  CreditCard,
  Activity,
  Trophy,
  AlertTriangle,
  GitCompare,
  BarChart3,
} from "lucide-react";
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

const formatNumber = (value: number, decimals = 2) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);

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
  }, [start, end, locationId, selectedChargerIds]);

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
          chargerIds: [chargerA],
        }),
        fetchChargerComparison({
          start: startB,
          end: endB,
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
  }, [chargerA, chargerB, startA, endA, startB, endB, locA, locB]);

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
    <div className="max-w-7xl mx-auto px-6 space-y-6">
      <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-primary" />
                Charger Comparison
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Select two chargers and date ranges. Compare utilization, revenue, and energy at a glance.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3 rounded-xl border-2 border-primary/20 bg-primary/[0.03] p-4 transition-shadow hover:shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Charger A
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Organization</Label>
                      <AppSelect
                        options={orgOptions}
                        value={orgA}
                        onChange={setOrgA}
                        placeholder="Select org"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Location</Label>
                      <AppSelect
                        options={locOptionsA}
                        value={locA}
                        onChange={setLocA}
                        placeholder="All"
                        isDisabled={!orgA || locOptionsA.length === 0}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Charger</Label>
                      <AppSelect
                        options={chargerOptionsA}
                        value={chargerA}
                        onChange={setChargerA}
                        placeholder="Select charger"
                        isDisabled={chargerOptionsA.length === 0}
                      />
                    </div>
                    <div className="min-w-0 grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
                      <div className="space-y-1 min-w-0">
                        <Label className="text-xs">Start date</Label>
                        <Input
                          type="date"
                          value={startA}
                          onChange={(e) => setStartA(e.target.value)}
                          className="w-full min-w-0 box-border pr-8"
                        />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <Label className="text-xs">End date</Label>
                        <Input
                          type="date"
                          value={endA}
                          onChange={(e) => setEndA(e.target.value)}
                          className="w-full min-w-0 box-border pr-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border-2 border-border bg-muted/20 p-4 transition-shadow hover:shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Charger B
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Organization</Label>
                      <AppSelect
                        options={orgOptions}
                        value={orgB}
                        onChange={setOrgB}
                        placeholder="Select org"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Location</Label>
                      <AppSelect
                        options={locOptionsB}
                        value={locB}
                        onChange={setLocB}
                        placeholder="All"
                        isDisabled={!orgB || locOptionsB.length === 0}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Charger</Label>
                      <AppSelect
                        options={chargerOptionsB}
                        value={chargerB}
                        onChange={setChargerB}
                        placeholder="Select charger"
                        isDisabled={chargerOptionsB.length === 0}
                      />
                    </div>
                    <div className="min-w-0 grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
                      <div className="space-y-1 min-w-0">
                        <Label className="text-xs">Start date</Label>
                        <Input
                          type="date"
                          value={startB}
                          onChange={(e) => setStartB(e.target.value)}
                          className="w-full min-w-0 box-border pr-8"
                        />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <Label className="text-xs">End date</Label>
                        <Input
                          type="date"
                          value={endB}
                          onChange={(e) => setEndB(e.target.value)}
                          className="w-full min-w-0 box-border pr-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Different orgs, locations, or time ranges are supported.
                </p>
                <Button
                  size="default"
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
                  className="transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {headLoading ? "Comparing…" : "Compare A vs B"}
                </Button>
              </div>

              {headError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {headError}
                </div>
              )}

              {headLoading && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Skeleton className="h-20 rounded-lg" />
                    <Skeleton className="h-20 rounded-lg" />
                    <Skeleton className="h-20 rounded-lg" />
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
                <TooltipProvider delayDuration={300}>
                  <div className="space-y-8 animate-in fade-in duration-200">
                    <section className="rounded-xl bg-muted/20 border border-border/40 overflow-hidden transition-shadow duration-300 hover:shadow-sm">
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
                                Charger {headSummary.winnerSide} — Best performer
                              </span>
                            </div>
                          </div>
                        )}
                        {headSummary.typeMismatch && (
                          <div className="flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>Different charger types.</span>
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
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-sm">Charger A</CardTitle>
                            {!statsA.onlineFlag && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Offline
                              </span>
                            )}
                          </div>
                          <CardDescription className="text-xs">
                            {statsA.name} · {statsA.type ?? "—"}
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
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Per session (kWh)</span><span className="tabular-nums">{formatNumber(headSummary.kwhPerSessionA, 2)}</span></div>
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
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-sm">Charger B</CardTitle>
                            {!statsB.onlineFlag && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Offline
                              </span>
                            )}
                          </div>
                          <CardDescription className="text-xs">
                            {statsB.name} · {statsB.type ?? "—"}
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
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Per session (kWh)</span><span className="tabular-nums">{formatNumber(headSummary.kwhPerSessionB, 2)}</span></div>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                </div>
                </TooltipProvider>
              )}
            </CardContent>
          </Card>
    </div>
  );
}
