import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchActiveSessionsHistory, fetchDashboardStats } from "@/services/api";

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
  const [serverHistoryLoading, setServerHistoryLoading] = useState(false);
  const [serverHistoryUpdatedAt, setServerHistoryUpdatedAt] = useState<number | null>(null);

  const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
  const SAMPLE_EVERY_MS = 5 * 60 * 1000; // 5 minutes (faster render)
  const STORAGE_KEY = "glance:activeSessions:last24h:v1";

  const normalizeTs = (ts: unknown) => {
    const n = Number(ts);
    if (!Number.isFinite(n)) return NaN;
    // Heuristic: if backend sends seconds, convert to ms
    return n < 1e12 ? n * 1000 : n;
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

    // Bucket to 1-minute points and keep the last value per bucket
    const byBucket = new Map<number, number>();
    for (const p of normalized) {
      const bucket = Math.floor(p.ts / SAMPLE_EVERY_MS) * SAMPLE_EVERY_MS;
      byBucket.set(bucket, p.count);
    }

    // If we have any data, start from the first point count; otherwise use current stat
    let lastCount = normalized.length ? normalized[0].count : data.activeSessions;

    const out: ChartDataPoint[] = [];
    for (let t = startAligned; t <= endAligned; t += SAMPLE_EVERY_MS) {
      if (byBucket.has(t)) lastCount = byBucket.get(t)!;
      out.push({ ts: t, count: lastCount });
    }

    return { data: out, domain: [startAligned, endAligned] as [number, number] };
  }, [chartData, data.activeSessions]);

  // Hydrate chart history on mount (so it shows last 24h immediately if available)
  useEffect(() => {
    const now = Date.now();
    const cutoff = now - HISTORY_WINDOW_MS;
    const hydrate = async () => {
      setHistoryLoading(true);
      let cancelled = false;

      // 1) Fast path: browser cache (show line quickly)
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned: ChartDataPoint[] = parsed
              .map((p: any) => ({ ts: normalizeTs(p.ts), count: Number(p.count) }))
              .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.count) && p.ts >= cutoff);
            if (cleaned.length) {
              setChartData(cleaned);
              setHistoryLoading(false);
            }
          }
        }
      } catch {
        // ignore
      }

      // If cache didn't have anything, still stop the loading spinner after a short delay
      // so axes show quickly, and we wait only for the real server line.
      setTimeout(() => {
        if (!cancelled) setHistoryLoading(false);
      }, 300);

      // 2) Preferred: load server history (update when it arrives)
      try {
        setServerHistoryLoading(true);
        const server = await fetchActiveSessionsHistory(24);
        if (cancelled) return;
        setServerHistoryUpdatedAt(Date.now()); // show update instantly when server responds
        if (server.length) {
          const cleaned = server
            .map((p) => ({ ts: normalizeTs(p.ts), count: Number(p.count) }))
            .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.count) && p.ts >= cutoff);
          if (cleaned.length) {
            setChartData(cleaned);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore server errors
      } finally {
        if (!cancelled) setServerHistoryLoading(false);
      }

      return () => {
        cancelled = true;
      };
    };

    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const stats = await fetchDashboardStats();
      setData({
        utilization: stats.utilization,
        chargersOnline: stats.chargersOnline,
        activeSessions: stats.activeSessions,
        newUsers: stats.newUsers,
        sessions: stats.sessions,
        payments: stats.payments,
        faults: stats.faults,
        revenue: stats.revenue,
        tariffAC: stats.tariffAC,
        tariffDC: stats.tariffDC,
      });

      // Update chart data (keep last 12 hours)
      const now = Date.now();
      setChartData((prev) => {
        const cutoff = now - HISTORY_WINDOW_MS;
        let next = prev.filter((p) => p.ts >= cutoff);
        const last = next[next.length - 1];

        // sample at most once per minute to avoid huge arrays
        if (!last || now - last.ts >= SAMPLE_EVERY_MS) {
          next = [...next, { ts: now, count: stats.activeSessions }];
        } else {
          next = [...next.slice(0, -1), { ts: last.ts, count: stats.activeSessions }];
        }

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage failures
        }

        return next;
      });
    };

    loadData();
    // Refresh every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getUtilizationColor = (value: number) => {
    if (value < 60) return "#5cd65c";
    if (value < 90) return "#ffc800";
    return "#ea5353";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Glance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Utilization Gauge */}
          <div className="flex flex-col items-center justify-center p-4 border border-border rounded-lg">
            <div className="relative w-32 h-32 mb-2">
              <svg className="transform -rotate-90 w-32 h-32">
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
                <span className="text-2xl font-bold">{data.utilization.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">Utilization</p>
          </div>

          {/* Chargers Online Gauge */}
          <div className="flex flex-col items-center justify-center p-4 border border-border rounded-lg">
            <div className="relative w-32 h-32 mb-2">
              <svg className="transform -rotate-90 w-32 h-32">
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
                <span className="text-2xl font-bold">{data.chargersOnline}</span>
                <span className="text-xs text-muted-foreground">units</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">Chargers Online</p>
          </div>

          {/* Chart */}
          <div className="p-4 border border-border rounded-lg">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Active Sessions</span>
              <span>
                {serverHistoryLoading
                  ? "Updating…"
                  : serverHistoryUpdatedAt
                    ? `Updated ${formatHms(serverHistoryUpdatedAt)}`
                    : "—"}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={filledChart.data}>
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
                {/* أثناء التحميل: أظهر المحاور فقط بدون خط أحمر */}
                {!historyLoading && chartData.length > 0 ? (
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    name="Active Sessions"
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="flex flex-col items-center justify-center p-3 border border-border rounded-lg">
            <p className="text-lg font-bold">{data.newUsers}</p>
            <p className="text-xs text-muted-foreground text-center">New users</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 border border-border rounded-lg">
            <p className="text-lg font-bold">{data.sessions}</p>
            <p className="text-xs text-muted-foreground text-center">Sessions</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 border border-border rounded-lg">
            <p className="text-lg font-bold">{data.payments}</p>
            <p className="text-xs text-muted-foreground text-center">Payments</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 border border-border rounded-lg">
            <p className="text-lg font-bold">{data.faults}</p>
            <p className="text-xs text-muted-foreground text-center">Faults</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 border border-border rounded-lg">
            <p className="text-lg font-bold">{data.revenue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground text-center">Revenue</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 border border-border rounded-lg">
            <p className="text-lg font-bold">{data.tariffAC.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground text-center">Tariff AC</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 border border-border rounded-lg">
            <p className="text-lg font-bold">{data.tariffDC.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground text-center">Tariff DC</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

