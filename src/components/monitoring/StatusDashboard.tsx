import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/shared/AppSelect";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  Search,
  Zap,
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import {
  fetchChargersStatus,
  fetchConnectorStatusCounts,
  type ChargerWithMonitoringDetails,
  type ConnectorStatusCounts,
  type MonitoringStatusConnector,
} from "@/services/api";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

type ChargerStatus = "online" | "offline" | "available" | "busy" | "error";

type DashboardChargerRow = ChargerWithMonitoringDetails & {
  listStatus: ChargerStatus;
};

function groupChargersByLocationName(items: DashboardChargerRow[]): [string, DashboardChargerRow[]][] {
  const m = new Map<string, DashboardChargerRow[]>();
  for (const item of items) {
    const key = (item.locationName ?? "").trim() || "Unknown";
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(item);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function getConnectorImage(standard: string): string {
  const u = standard.trim().toUpperCase().replace(/\s+/g, " ");
  if (u.includes("CCS2") || u.includes("CCS 2")) return "/ccs2.png";
  if (u.includes("CCS1") || u.includes("CCS 1") || (u.includes("CCS") && u.includes("1") && !u.includes("2")))
    return "/ccs1.png";
  if (u.includes("CHADEMO")) return "/CHAdeMO.png";
  if (u.includes("GBT") && u.includes("AC")) return "/GBTAC.png";
  if (u.includes("GBT") && u.includes("DC")) return "/GBTDC1.png";
  if (u.includes("TYPE 2") || u === "TYPE2") return "/type2.png";
  if (u.includes("TYPE 1") || u === "TYPE1") return "/type1.png";
  return "/placeholder.svg";
}

function DashboardStatValue({
  loading,
  value,
  valueClassName,
}: {
  loading: boolean;
  value: number;
  valueClassName?: string;
}) {
  if (loading) {
    return <Skeleton className="h-8 w-14" aria-hidden />;
  }
  return <p className={cn("text-2xl font-bold", valueClassName)}>{value}</p>;
}

function DashboardStatFraction({
  loading,
  numerator,
  denominator,
  numeratorClassName,
  ratioLabel,
}: {
  loading: boolean;
  numerator: number;
  denominator: number;
  numeratorClassName?: string;
  ratioLabel: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" aria-hidden />
        <Skeleton className="h-3 w-28" aria-hidden />
      </div>
    );
  }
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-1 leading-tight">
        <span className={cn("text-2xl font-bold tabular-nums", numeratorClassName)}>{numerator}</span>
        <span className="text-sm font-medium tabular-nums text-muted-foreground">/ {denominator}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{ratioLabel}</p>
    </div>
  );
}

export const StatusDashboard = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);

  const [chargers, setChargers] = useState<DashboardChargerRow[]>([]);
  /** List area: show placeholder only before first charger list response */
  const [listLoading, setListLoading] = useState(true);
  /** Summary cards: skeleton on first counts fetch only (not on 30s poll) */
  const [countsLoading, setCountsLoading] = useState(true);
  const listInitialDoneRef = useRef(false);
  const [counts, setCounts] = useState<ConnectorStatusCounts | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [chargerListSearch, setChargerListSearch] = useState("");

  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

  const filteredChargers = useMemo(() => {
    const q = chargerListSearch.trim().toLowerCase();
    if (!q) return chargers;
    return chargers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        String(c.id).toLowerCase().includes(q),
    );
  }, [chargers, chargerListSearch]);

  const pagedListTotal = filteredChargers.length;
  const pageCount = Math.max(1, Math.ceil(pagedListTotal / pageSize));
  const start = (page - 1) * pageSize;
  const visibleChargers = useMemo(
    () => filteredChargers.slice(start, start + pageSize),
    [filteredChargers, start, pageSize]
  );

  const groupedVisibleChargers = useMemo(
    () => groupChargersByLocationName(visibleChargers),
    [visibleChargers]
  );

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!canRead("charger.status")) {
      setListLoading(false);
      setCountsLoading(false);
      return;
    }

    let cancelled = false;

    const mapStatusToChargers = (status: Awaited<ReturnType<typeof fetchChargersStatus>>): DashboardChargerRow[] => [
      ...status.online.map((c) => ({
        ...c,
        listStatus: "online" as ChargerStatus,
      })),
      ...status.offline.map((c) => ({
        ...c,
        listStatus: "offline" as ChargerStatus,
      })),
    ];

    const loadChargers = async (showInitialListPlaceholder: boolean) => {
      try {
        if (showInitialListPlaceholder) setListLoading(true);
        console.log("📊 StatusDashboard: Loading charger list...");
        const status = await fetchChargersStatus();
        console.log("📊 StatusDashboard: Charger list received:", status);
        if (!cancelled) setChargers(mapStatusToChargers(status));
      } catch (error) {
        console.error("Error loading charger status:", error);
      } finally {
        if (!cancelled) {
          setListLoading(false);
          listInitialDoneRef.current = true;
        }
      }
    };

    const loadCounts = async (showCardSkeletons: boolean) => {
      try {
        if (showCardSkeletons) setCountsLoading(true);
        const next = await fetchConnectorStatusCounts();
        if (!cancelled) setCounts(next);
      } catch (error) {
        console.error("Error loading connector counts:", error);
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    };

    loadChargers(!listInitialDoneRef.current);
    loadCounts(true);

    const interval = setInterval(() => {
      loadChargers(false);
      loadCounts(false);
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [canRead]);

  const getChargerListStatusBadge = (status: ChargerStatus) => {
    const variants: Record<ChargerStatus, "default" | "secondary" | "destructive" | "outline"> = {
      online: "default",
      available: "default",
      busy: "secondary",
      offline: "outline",
      error: "destructive",
    };

    const colors: Record<ChargerStatus, string> = {
      online: "bg-green-500",
      available: "bg-blue-500",
      busy: "bg-yellow-500",
      offline: "bg-gray-500",
      error: "bg-red-500",
    };

    return (
      <Badge variant={variants[status]}>
        <div className={cn("mr-2 h-2 w-2 rounded-full", colors[status])} />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getConnectorStatusBadge = (conn: MonitoringStatusConnector) => {
    const dot = (cls: string) => <div className={cn("mr-2 h-2 w-2 shrink-0 rounded-full", cls)} />;

    switch (conn.status) {
      case "available":
        return (
          <Badge variant="default">
            {dot("bg-green-500")}
            Available
          </Badge>
        );
      case "busy":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/60 text-amber-900 dark:border-amber-500/50 dark:text-amber-100"
          >
            {dot("bg-amber-500")}
            Busy
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            {dot("bg-red-500")}
            Unavailable
          </Badge>
        );
      case "unavailable":
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {dot("bg-yellow-500/80")}
            Unavailable
          </Badge>
        );
      case "preparing":
        return (
          <Badge variant="secondary" className="text-muted-foreground">
            {dot("bg-gray-400")}
            Preparing
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {dot("bg-gray-400")}
            {conn.statusLabel}
          </Badge>
        );
    }
  };

  const stats = {
    totalChargers: counts?.totalChargers ?? 0,
    onlineChargers: counts?.onlineChargers ?? 0,
    offlineChargers: counts?.offlineChargers ?? 0,
    totalConnectors: counts?.totalConnectors ?? 0,
    availableConnectors: counts?.availableConnectors ?? 0,
    errorConnectors: counts?.errorConnectors ?? 0,
  };

  return (
    <PermissionGuard
      role={role}
      permission="charger.status"
      action="read"
      fallback={
        <Card>
          <CardContent className="py-8">
            <EmptyState
              title="Access Denied"
              description="You don't have permission to view charger status."
            />
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        {chargers.length > 0 && (
          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search by charger name or ID"
              className="bg-muted/40 pl-10"
              value={chargerListSearch}
              onChange={(e) => {
                setChargerListSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search chargers by name or ID"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Chargers</p>
                  <DashboardStatValue loading={countsLoading} value={stats.totalChargers} />
                </div>
                <Activity className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online Chargers</p>
                  <DashboardStatFraction
                    loading={countsLoading}
                    numerator={stats.onlineChargers}
                    denominator={stats.totalChargers}
                    numeratorClassName="text-green-600"
                    ratioLabel="Online / Total"
                  />
                </div>
                <CheckCircle2 className="w-8 h-8 shrink-0 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Connector</p>
                  <DashboardStatFraction
                    loading={countsLoading}
                    numerator={stats.availableConnectors}
                    denominator={stats.totalConnectors}
                    numeratorClassName="text-green-600"
                    ratioLabel="Available / Total"
                  />
                </div>
                <CheckCircle2 className="w-8 h-8 shrink-0 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Offline Chargers</p>
                  <DashboardStatFraction
                    loading={countsLoading}
                    numerator={stats.offlineChargers}
                    denominator={stats.totalChargers}
                    numeratorClassName="text-gray-600"
                    ratioLabel="Offline / Total"
                  />
                </div>
                <Activity className="w-8 h-8 shrink-0 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Error Connector</p>
                  <DashboardStatFraction
                    loading={countsLoading}
                    numerator={stats.errorConnectors}
                    denominator={stats.totalConnectors}
                    numeratorClassName="text-red-600"
                    ratioLabel="Error / Total"
                  />
                </div>
                <AlertCircle className="w-8 h-8 shrink-0 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Charger & Connector details</CardTitle>
          </CardHeader>
          <CardContent>
            {listLoading && chargers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : chargers.length === 0 ? (
              <EmptyState
                title="No Chargers"
                description="No chargers found in the system."
              />
            ) : filteredChargers.length === 0 ? (
              <EmptyState title="No chargers found" description="Try a different search term." />
            ) : (
              <>
                <div className="space-y-8">
                  {groupedVisibleChargers.map(([locationName, locChargers]) => (
                    <section key={locationName} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-border pb-2">
                        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <h3 className="text-sm font-semibold tracking-tight">{locationName}</h3>
                      </div>
                      <div className="space-y-3 border-l-2 border-muted pl-3 sm:pl-4">
                        {locChargers.map((charger) => (
                          <div
                            key={charger.id}
                            className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:bg-muted/40"
                          >
                            <div className="flex flex-wrap items-center gap-2 gap-y-2 p-3 sm:p-4">
                              <Zap className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                              <p className="min-w-0 flex-1 font-medium leading-tight">{charger.name}</p>
                              <Badge variant="secondary" className="shrink-0 font-mono text-xs text-muted-foreground">
                                {charger.shortId}
                              </Badge>
                              {getChargerListStatusBadge(charger.listStatus)}
                              <Badge variant="outline" className="shrink-0 text-xs">
                                {charger.chargerCurrentType}
                              </Badge>
                              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                {charger.time && !Number.isNaN(new Date(charger.time).getTime())
                                  ? new Date(charger.time).toLocaleString(undefined, { hour12: false })
                                  : "—"}
                              </span>
                            </div>
                            <div className="space-y-2 border-t border-border bg-muted/20 px-3 py-2 sm:px-6 sm:py-3">
                              {charger.connectors.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No connectors</p>
                              ) : (
                                charger.connectors.map((conn) => (
                                  <div
                                    key={conn.id || `${charger.id}-${conn.standardName}`}
                                    className="flex flex-wrap items-center gap-2 gap-y-2 rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm"
                                  >
                                    <img
                                      src={getConnectorImage(conn.standardName)}
                                      alt={conn.standardName}
                                      className="h-8 w-8 shrink-0 rounded-full object-contain"
                                      onError={(e) => {
                                        e.currentTarget.src = "/placeholder.svg";
                                      }}
                                    />
                                    <span className="min-w-0 font-medium">{conn.standardName}</span>
                                    {getConnectorStatusBadge(conn)}
                                    <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                                      {conn.powerLabel}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
                {pagedListTotal > 0 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t pt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline">Rows per page</span>
                      <AppSelect
                        options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                        value={String(pageSize)}
                        onChange={(v) => {
                          const n = Number(v);
                          if (PAGE_SIZE_OPTIONS.includes(n as 10 | 25 | 50 | 100)) {
                            setPageSize(n);
                            setPage(1);
                          }
                        }}
                        placeholder="Rows"
                        size="sm"
                        className="w-[88px]"
                      />
                    </div>
                    <span>
                      {pagedListTotal === 0
                        ? "0–0 of 0"
                        : `${start + 1}–${Math.min(start + pageSize, pagedListTotal)} of ${pagedListTotal}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(1)}
                        disabled={page <= 1}
                        aria-label="First page"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                        disabled={page >= pageCount}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(pageCount)}
                        disabled={page >= pageCount}
                        aria-label="Last page"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
};
