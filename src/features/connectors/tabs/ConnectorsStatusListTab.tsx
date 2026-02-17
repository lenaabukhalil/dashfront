import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  fetchAllConnectorsStatus,
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsWithStatusByCharger,
  type ConnectorWithStatus,
} from "@/services/api";
import type { SelectOption } from "@/types";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CONCURRENCY = 15;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export interface ConnectorStatusRow {
  organizationName: string;
  locationName: string;
  chargerId: string;
  chargerName: string;
  connectorId: string;
  connectorType: string;
  status: string;
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const isAvailable = s === "available" || s === "online";
  const isUnavailable = s === "unavailable" || s === "offline";
  const isFaulted = s === "faulted" || s === "error";
  const isCharging = s === "charging" || s === "busy";

  const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-black/5 shadow-sm";
  return (
    <span
      className={cn(
        base,
        isAvailable && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        isUnavailable && "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
        isFaulted && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        isCharging && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        !isAvailable && !isUnavailable && !isFaulted && !isCharging && "bg-muted text-muted-foreground"
      )}
    >
      {status || "—"}
    </span>
  );
}

async function runChunked<T, R>(
  items: T[],
  fn: (item: T) => Promise<R[]>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map(fn));
    results.forEach((arr) => out.push(...arr));
  }
  return out;
}

interface ConnectorsStatusListTabProps {
  refreshKey?: number;
}

export function ConnectorsStatusListTab({ refreshKey = 0 }: ConnectorsStatusListTabProps) {
  const [rows, setRows] = useState<ConnectorStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page, setPage] = useState(1);

  const loadAll = useCallback(async (bustCache?: number) => {
    setError(null);
    setLoading(true);
    try {
      const fastRows = await fetchAllConnectorsStatus(bustCache ?? undefined);
      if (fastRows !== null) {
        setRows(fastRows);
        return;
      }

      const orgs: SelectOption[] = await fetchChargerOrganizations();
      const locationResults = await Promise.all(orgs.map((o) => fetchLocationsByOrg(o.value)));
      const allLocations: { locationId: string; locationName: string; organizationName: string }[] = [];
      for (let i = 0; i < orgs.length; i++) {
        for (const loc of locationResults[i]) {
          allLocations.push({
            locationId: loc.value,
            locationName: loc.label,
            organizationName: orgs[i].label,
          });
        }
      }

      const chargerResults = await Promise.all(
        allLocations.map((loc) => fetchChargersByLocation(loc.locationId))
      );
      const allChargers: {
        chargerId: string;
        chargerName: string;
        locationName: string;
        organizationName: string;
      }[] = [];
      for (let i = 0; i < allLocations.length; i++) {
        const loc = allLocations[i];
        for (const c of chargerResults[i]) {
          allChargers.push({
            chargerId: c.value,
            chargerName: c.label,
            locationName: loc.locationName,
            organizationName: loc.organizationName,
          });
        }
      }

      const connectorRows = await runChunked(
        allChargers,
        async ({ chargerId, chargerName, locationName, organizationName }) => {
          const connectors: ConnectorWithStatus[] = await fetchConnectorsWithStatusByCharger(chargerId);
          return connectors.map((c) => ({
            organizationName,
            locationName,
            chargerId,
            chargerName,
            connectorId: c.connectorId,
            connectorType: c.connectorType,
            status: c.status,
          }));
        }
      );

      setRows(connectorRows);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll(refreshKey > 0 ? Date.now() : undefined);
  }, [loadAll, refreshKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.organizationName.toLowerCase().includes(q) ||
        r.locationName.toLowerCase().includes(q) ||
        r.chargerName.toLowerCase().includes(q) ||
        String(r.connectorId).toLowerCase().includes(q) ||
        r.connectorType.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const visible = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const rangeText =
    total === 0
      ? "0-0 of 0"
      : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Connectors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error.message}
            <Button variant="outline" size="sm" className="mt-2" onClick={loadAll}>
              Retry
            </Button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by Organization, Location, Charger, Connector..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {loading && rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        ) : total === 0 ? (
          <EmptyState title="No Connectors" description="No connectors found." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Organization</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Charger</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Connector ID</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr
                      key={`${r.chargerId}-${r.connectorId}`}
                      className="hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">{r.organizationName}</td>
                      <td className="py-3 px-4">{r.locationName}</td>
                      <td className="py-3 px-4">{r.chargerName}</td>
                      <td className="py-3 px-4 font-mono text-xs">{r.connectorId}</td>
                      <td className="py-3 px-4">{r.connectorType || "—"}</td>
                      <td className="py-3 px-4">
                        <StatusPill status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Items per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    const next = Number(v);
                    if (!Number.isFinite(next) || !PAGE_SIZE_OPTIONS.includes(next as (typeof PAGE_SIZE_OPTIONS)[number])) return;
                    setPageSize(next as (typeof PAGE_SIZE_OPTIONS)[number]);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[88px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span>{rangeText}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    aria-label="First page"
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page >= pageCount}
                    aria-label="Next page"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(pageCount)}
                    disabled={page >= pageCount}
                    aria-label="Last page"
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
