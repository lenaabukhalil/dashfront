import * as React from "react";
import { Loader2, Stethoscope } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthToken } from "@/services/api";

/** Mirrors `API_BASE_URL` in `api.ts` (not exported there). */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "/api" : "https://dash.evse.cloud/api");

type ProbeStatus = string;

interface ProbeResult {
  stepLabel: string;
  url: string;
  status: ProbeStatus;
  elapsedMs: number;
  bodyPreview: string;
}

function diagnosticFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

async function runProbe(args: {
  stepLabel: string;
  url: string;
  method?: string;
  timeoutMs: number;
}): Promise<ProbeResult> {
  const { stepLabel, url, method = "GET", timeoutMs } = args;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await diagnosticFetch(url, { method, signal: controller.signal });
    window.clearTimeout(timer);
    const elapsedMs = Math.round(performance.now() - start);
    const text = await res.text();
    return {
      stepLabel,
      url,
      status: String(res.status),
      elapsedMs,
      bodyPreview: text.slice(0, 500),
    };
  } catch (err: unknown) {
    window.clearTimeout(timer);
    const elapsedMs = Math.round(performance.now() - start);
    const aborted =
      (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError");
    return {
      stepLabel,
      url,
      status: aborted ? "TIMEOUT" : "NETWORK_ERROR",
      elapsedMs,
      bodyPreview: err instanceof Error ? err.message : String(err),
    };
  }
}

export default function ArchiveDiagnostic() {
  const [chargerId, setChargerId] = React.useState("1000026");
  const [running, setRunning] = React.useState(false);
  const [results, setResults] = React.useState<ProbeResult[]>([]);

  const runDiagnosis = async () => {
    const id = chargerId.trim();
    if (!id) return;

    setRunning(true);
    setResults([]);

    const base = `${API_BASE_URL}/v4`;
    const url1 = `${base}/charger?id=${encodeURIComponent(id)}`;
    const url2 = `${base}/connector?chargerId=${encodeURIComponent(id)}`;
    const url3 = `${base}/charger?id=${encodeURIComponent(id)}`;

    const out: ProbeResult[] = [];

    out.push(
      await runProbe({
        stepLabel: "1) GET charger (exists?)",
        url: url1,
        timeoutMs: 30_000,
      }),
    );
    setResults([...out]);

    out.push(
      await runProbe({
        stepLabel: "2) GET connectors (count)",
        url: url2,
        timeoutMs: 30_000,
      }),
    );
    setResults([...out]);

    out.push(
      await runProbe({
        stepLabel: "3) DELETE charger",
        url: url3,
        method: "DELETE",
        timeoutMs: 60_000,
      }),
    );
    setResults([...out]);

    out.push(
      await runProbe({
        stepLabel: "4) GET charger again (is_deleted / mutation?)",
        url: url1,
        timeoutMs: 30_000,
      }),
    );
    setResults([...out]);

    setRunning(false);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Stethoscope className="h-7 w-7 text-muted-foreground" aria-hidden />
            Archive / DELETE diagnostic
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Temporary tool: runs real API calls in order. Step 3 performs{" "}
            <span className="font-medium text-destructive">DELETE /api/v4/charger</span>.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Probes</CardTitle>
            <CardDescription>
              Sequential checks with timings. DELETE uses a 60s client timeout; GET steps use 30s.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="archive-diag-charger-id">Charger ID</Label>
                <Input
                  id="archive-diag-charger-id"
                  value={chargerId}
                  onChange={(e) => setChargerId(e.target.value)}
                  placeholder="e.g. 1000026"
                  disabled={running}
                  autoComplete="off"
                />
              </div>
              <Button type="button" onClick={runDiagnosis} disabled={running || !chargerId.trim()}>
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Running…
                  </>
                ) : (
                  "Run diagnosis"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 ? (
          <div className="space-y-4">
            {results.map((r, i) => (
              <Card key={`${r.stepLabel}-${i}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{r.stepLabel}</CardTitle>
                  <CardDescription className="font-mono text-xs break-all">{r.url}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <span className="text-muted-foreground">HTTP status: </span>
                      <span className="font-mono font-medium">{r.status}</span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">Elapsed: </span>
                      <span className="font-mono font-medium">{r.elapsedMs} ms</span>
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Response body (first 500 chars)</p>
                    <pre className="mt-1 max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap break-all">
                      {r.bodyPreview || "(empty)"}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
