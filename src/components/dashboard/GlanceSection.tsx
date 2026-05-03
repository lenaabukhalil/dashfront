import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertCircle } from "lucide-react";
import { fetchActiveSessions, fetchActiveSessionsHistory, fetchDashboardStats } from "@/services/api";
import { GlanceCard } from "@/components/shared/GlanceCard";

interface GlanceData {
  utilization: number;
  chargersOnline: number;
  activeSessions: number;
  newUsers: number;
  sessions: number;
  payments: number;
  faults: number;
  revenue: number;
  tariffAC: number;
  tariffDC: number;
}

interface ChartDataPoint {
  ts: number; // epoch ms
  count: number;
}

const CHART_HEIGHT = 150;

function ChartSkeleton({ "aria-label": ariaLabel }: { "aria-label"?: string }) {
  return (
    <div
      className="flex flex-col h-[150px] rounded-lg overflow-hidden"
      style={{ minHeight: CHART_HEIGHT }}
      role="status"
      aria-label={ariaLabel ?? "Loading chart"}
      aria-busy="true"
    >
      <div className="flex gap-2 mb-3">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-3 w-16 rounded ml-auto" />
      </div>
      <Skeleton className="flex-1 w-full rounded min-h-[120px]" />
    </div>
  );
}

export const GlanceSection = () => {
  const [data, setData] = useState<GlanceData>({
    utilization: 0,
    chargersOnline: 0,
    activeSessions: 0,
    newUsers: 0,
    sessions: 0,
    payments: 0,
    faults: 0,
    revenue: 0,
    tariffAC: 0,
    tariffDC: 0,
  });

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [hasServerHistoryLoaded, setHasServerHistoryLoaded] = useState(false);
  const [chartHistoryError, setChartHistoryError] = useState<Error | null>(null);
  const [serverHistoryLoading, setServerHistoryLoading] = useState(false);
  const [serverHistoryUpdatedAt, setServerHistoryUpdatedAt] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<Error | null>(null);
  const loadDataRef = useRef<() => void>(() => {});
  const loadHistoryRef = useRef<() => void>(() => {});
  const isInitialServerFetch = useRef(true);

  const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
  const SAMPLE_EVERY_MS = 5 * 60 * 1000; // 5 minutes (faster render)
  const STORAGE_KEY = "glance:activeSessions:last24h:v1";

  const normalizeTs = (ts: unknown) => {
    const n = Number(ts);
    if (!Number.isFinite(n)) return NaN;
    return n < 1e12 ? n * 1000 : n;
  };

  /** Last history point is overridden with live session count (history API can be stale). */
  const mergeHistoryWithLiveCount = (cleaned: ChartDataPoint[], live: number, now: number): ChartDataPoint[] => {
    if (cleaned.length === 0) return [{ ts: now, count: live }];
    const merged = [...cleaned];
    const last = merged[merged.length - 1]!;
    if (now - last.ts > 2 * 60 * 1000) {
      merged.push({ ts: now, count: live });
    } else {
      merged[merged.length - 1] = { ts: last.ts, count: live };
    }
    return merged;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const formatHms = (ts: number) => {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const filledChart = useMemo(() => {
    const now = Date.now();
    const windowStart = now - HISTORY_WINDOW_MS;
    const startAligned = Math.floor(windowStart / SAMPLE_EVERY_MS) * SAMPLE_EVERY_MS;
    const endAligned = Math.floor(now / SAMPLE_EVERY_MS) * SAMPLE_EVERY_MS;

    const normalized = chartData
      .map((p) => ({ ts: normalizeTs(p.ts), count: Number(p.count) }))
      .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.count))
      .filter((p) => p.ts >= startAligned && p.ts <= endAligned)
      .sort((a, b) => a.ts - b.ts);

    const byBucket = new Map<number, number>();
    for (const p of normalized) {
      const bucket = Math.floor(p.ts / SAMPLE_EVERY_MS) * SAMPLE_EVERY_MS;
      byBucket.set(bucket, p.count);
    }

    let lastCount = normalized.length ? normalized[0].count : data.activeSessions;

    const out: ChartDataPoint[] = [];
    for (let t = startAligned; t <= endAligned; t += SAMPLE_EVERY_MS) {
      if (byBucket.has(t)) lastCount = byBucket.get(t)!;
      if (t >= endAligned - SAMPLE_EVERY_MS) lastCount = data.activeSessions;
      out.push({ ts: t, count: lastCount });
    }

    return { data: out, domain: [startAligned, endAligned] as [number, number] };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- HISTORY_WINDOW_MS, SAMPLE_EVERY_MS are stable constants
  }, [chartData, data.activeSessions]);

  useEffect(() => {
    const now = Date.now();
    const cutoff = now - HISTORY_WINDOW_MS;

    setChartData([]);
    setHistoryLoading(true);

    let cached: ChartDataPoint[] | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned: ChartDataPoint[] = parsed
            .map((p) => {
            const pt = p as { ts?: number; count?: number };
            return { ts: normalizeTs(pt.ts), count: Number(pt.count) };
          })
            .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.count) && p.ts >= cutoff);
          if (cleaned.length) cached = cleaned;
        }
      }
    } catch {
    }

    let cancelled = false;
    const runServerFetch = async () => {
      setChartHistoryError(null);
      if (isInitialServerFetch.current) setHistoryLoading(true);
      try {
        setServerHistoryLoading(true);
        const now = Date.now();
        const [server, liveSessions] = await Promise.all([
          fetchActiveSessionsHistory(24),
          fetchActiveSessions(),
        ]);
        if (cancelled) return;
        const live = Array.isArray(liveSessions) ? liveSessions.length : 0;
        setServerHistoryUpdatedAt(now);
        setHasServerHistoryLoaded(true); // only after first server fetch succeeds
        isInitialServerFetch.current = false;
        if (server.length) {
          const cleaned = server
            .map((p) => ({ ts: normalizeTs(p.ts), count: Number(p.count) }))
            .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.count) && p.ts >= cutoff);
          if (cleaned.length) {
            const merged = mergeHistoryWithLiveCount(cleaned, live, now);
            setChartData(merged);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch {
            }
          } else {
            const single = mergeHistoryWithLiveCount([], live, now);
            setChartData(single);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(single));
            } catch {
            }
          }
        } else {
          const single = mergeHistoryWithLiveCount([], live, now);
          setChartData(single);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(single));
          } catch {
          }
        }
      } catch (e) {
        if (!cancelled) {
          setChartHistoryError(e instanceof Error ? e : new Error(String(e)));
          isInitialServerFetch.current = false;
        }
      } finally {
        if (!cancelled) {
          setServerHistoryLoading(false);
          setHistoryLoading(false);
        }
      }
    };

    loadHistoryRef.current = runServerFetch;
    runServerFetch();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setStatsError(null);
      try {
        const [stats, liveSessions] = await Promise.all([
          fetchDashboardStats(),
          fetchActiveSessions(),
        ]);
        const liveActive = Array.isArray(liveSessions) ? liveSessions.length : 0;
        setData({
          utilization: stats.utilization,
          chargersOnline: stats.chargersOnline,
          activeSessions: liveActive,
          newUsers: stats.newUsers,
          sessions: stats.sessions,
          payments: stats.payments,
          faults: stats.faults,
          revenue: stats.revenue,
          tariffAC: stats.tariffAC,
          tariffDC: stats.tariffDC,
        });

        const now = Date.now();
        setChartData((prev) => {
          const cutoff = now - HISTORY_WINDOW_MS;
          let next = prev.filter((p) => p.ts >= cutoff);
          const last = next[next.length - 1];

          if (!last || now - last.ts >= SAMPLE_EVERY_MS) {
            next = [...next, { ts: now, count: liveActive }];
          } else {
            next = [...next.slice(0, -1), { ts: last.ts, count: liveActive }];
          }

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
          }

          return next;
        });
      } catch (err) {
        setStatsError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setStatsLoading(false);
      }
    };

    loadDataRef.current = loadData;
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount, poll interval is intentional
  }, []);

  const getUtilizationColor = (value: number) => {
    if (value < 60) return "#5cd65c";
    if (value < 90) return "#ffc800";
    return "#ea5353";
  };

  const handleRetry = useCallback(() => {
    setStatsLoading(true);
    setStatsError(null);
    loadDataRef.current?.();
  }, []);

  const GAUGE_MIN_H = 220;
  const statCards: Array<{ id: string; title: string; value: string | number; unit?: string }> = useMemo(
    () => [
      { id: "newUsers", title: "New users", value: data.newUsers },
      { id: "sessions", title: "Sessions", value: data.sessions },
      { id: "payments", title: "Payments", value: data.payments },
      { id: "faults", title: "Faults", value: data.faults },
      { id: "revenue", title: "Revenue", value: data.revenue.toFixed(2) },
      { id: "tariffAC", title: "Tariff AC", value: data.tariffAC.toFixed(2) },
      { id: "tariffDC", title: "Tariff DC", value: data.tariffDC.toFixed(2) },
    ],
    [data.newUsers, data.sessions, data.payments, data.faults, data.revenue, data.tariffAC, data.tariffDC]
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <h2 className="text-lg font-semibold leading-tight tracking-tight">
          At a glance
        </h2>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        {statsError && (
          <Alert variant="destructive" role="alert" aria-live="assertive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" aria-hidden />
            <AlertTitle>Could not load stats</AlertTitle>
            <AlertDescription>
              {statsError.message}
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={handleRetry}
                aria-label="Retry loading stats"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section aria-busy={statsLoading} aria-label="Glance metrics">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            style={{ minHeight: GAUGE_MIN_H }}
          >
            <div
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 shadow-sm sm:col-span-1"
              style={{ minHeight: GAUGE_MIN_H }}
            >
              <div className="relative w-32 h-32 mb-2" aria-hidden>
                <svg className="transform -rotate-90 w-32 h-32" aria-hidden>
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="hsl(var(--muted))"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={getUtilizationColor(data.utilization)}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(data.utilization / 100) * 351.86} ${351.86}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums">{data.utilization.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground text-center">Utilization</p>
            </div>

            <div
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 shadow-sm sm:col-span-1"
              style={{ minHeight: GAUGE_MIN_H }}
            >
              <div className="relative w-32 h-32 mb-2" aria-hidden>
                <svg className="transform -rotate-90 w-32 h-32" aria-hidden>
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="hsl(var(--muted))"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={getUtilizationColor((data.chargersOnline / 100) * 100)}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(data.chargersOnline / 100) * 351.86} ${351.86}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums">{data.chargersOnline}</span>
                  <span className="text-xs text-muted-foreground">units</span>
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground text-center">Chargers Online</p>
            </div>

            <div
              className="rounded-xl border border-border bg-card p-4 shadow-sm sm:col-span-2 min-h-[200px] flex flex-col"
              style={{ minHeight: GAUGE_MIN_H }}
            >
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Active Sessions</span>
                <span aria-live="polite">
                  {serverHistoryLoading
                    ? "Updating…"
                    : serverHistoryUpdatedAt
                      ? `Updated ${formatHms(serverHistoryUpdatedAt)}`
                      : "—"}
                </span>
              </div>
              <div className="flex-1 min-h-[150px]">
                {!hasServerHistoryLoaded ? (
                  chartHistoryError ? (
                    <div
                      className="flex flex-col items-center justify-center min-h-[150px] h-[150px] text-center text-sm text-muted-foreground rounded-lg border border-dashed border-border bg-muted/30 gap-2"
                      role="alert"
                      aria-live="polite"
                    >
                      <p>Could not load session history</p>
                      <button
                        type="button"
                        onClick={() => {
                          setChartHistoryError(null);
                          loadHistoryRef.current?.();
                        }}
                        className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <ChartSkeleton aria-label="Loading session history" />
                  )
                ) : chartData.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center h-[150px] text-center text-sm text-muted-foreground rounded-lg border border-dashed border-border bg-muted/30"
                    role="status"
                    aria-label="No session history yet"
                  >
                    <p>No session history yet</p>
                    <p className="text-xs mt-1">Data will appear as sessions are recorded</p>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={filledChart.data} aria-hidden>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="ts"
                      type="number"
                      scale="time"
                      domain={filledChart.domain}
                      tickFormatter={(v) => formatTime(Number(v))}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip
                      labelFormatter={(label) => new Date(Number(label)).toLocaleString()}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      dot={false}
                      name="Active Sessions"
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((item) => (
              <GlanceCard
                key={item.id}
                title={item.title}
                value={item.value}
                loading={statsLoading}
                minHeight={88}
              />
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
};

