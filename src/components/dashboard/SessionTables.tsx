import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  fetchActiveSessions,
  fetchLocalSessions,
  type ActiveSession,
  type LocalSession,
} from "@/services/api";
import {
  formatSessionId,
  mergeAndSortSessions,
  mergedSessionKey,
  parseStartDateTime,
  type MergedSession,
} from "@/lib/merged-active-sessions";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const COLUMNS = 9;
const POLL_INTERVAL_MS = 5_000;

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

type SessionFilter = "all" | "ion" | "local";

/** `null` = not yet loaded (show em-dash); number = last known count from API envelope. */
type TabCountValue = number | null;

function formatTabAriaLabel(label: string, count: TabCountValue): string {
  if (count === null) return `${label}, loading sessions`;
  return `${label}, ${count} session${count === 1 ? "" : "s"}`;
}

function SessionFilterTab({
  value,
  label,
  count,
}: {
  value: SessionFilter;
  label: string;
  count: TabCountValue;
}) {
  return (
    <ToggleGroupItem
      value={value}
      aria-label={formatTabAriaLabel(label, count)}
      className="group"
    >
      {label}
      <span className="ml-1 text-muted-foreground/70 group-data-[state=on]:text-primary-foreground/70">
        (
        <span
          className="tabular-nums inline-block min-w-[1.25rem] text-center"
          aria-live="polite"
        >
          {count === null ? "—" : count}
        </span>
        )
      </span>
    </ToggleGroupItem>
  );
}

function formatDate(iso?: string) {
  if (!iso?.trim()) return "-";
  const d = parseStartDateTime(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const date = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
  const time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

function TableSkeleton({ columns, rows = 4 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-border last:border-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="py-3 px-2">
              <span className="inline-block h-4 w-full max-w-24 rounded bg-muted animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SessionTypeBadge({ sourceType }: { sourceType: MergedSession["sourceType"] }) {
  const isIon = sourceType === "ion";
  const label = isIon ? "ION" : "Local";
  const tooltip = isIon ? "ION Session" : "Local Session";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={isIon ? "default" : "secondary"}
          className={cn(
            "text-[10px] px-1.5 py-0 font-medium",
            !isIon && "text-muted-foreground",
          )}
        >
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export const SessionTables = () => {
  const [ionSessions, setIonSessions] = useState<ActiveSession[]>([]);
  const [localSessions, setLocalSessions] = useState<LocalSession[]>([]);
  const [ionCount, setIonCount] = useState<TabCountValue>(null);
  const [localCount, setLocalCount] = useState<TabCountValue>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<SessionFilter>("all");
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    let disposed = false;
    let pollTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let abortController: AbortController | null = null;

    const clearScheduledPoll = () => {
      if (pollTimeoutId !== null) {
        clearTimeout(pollTimeoutId);
        pollTimeoutId = null;
      }
    };

    const scheduleNextPoll = () => {
      if (disposed || document.hidden) return;
      clearScheduledPoll();
      pollTimeoutId = setTimeout(() => {
        pollTimeoutId = null;
        void runPollCycle();
      }, POLL_INTERVAL_MS);
    };

    const runPollCycle = async () => {
      if (disposed || document.hidden) return;

      abortController?.abort();
      const ac = new AbortController();
      abortController = ac;
      const { signal } = ac;

      const isInitial = !hasLoadedOnce.current;
      if (isInitial) setInitialLoad(true);
      else setRefreshing(true);

      try {
        const [ionResult, localResult] = await Promise.allSettled([
          fetchActiveSessions(),
          fetchLocalSessions(),
        ]);
        if (signal.aborted || disposed) return;

        if (ionResult.status === "fulfilled") {
          setIonSessions(ionResult.value.sessions);
          if (ionResult.value.count !== undefined) {
            setIonCount(ionResult.value.count);
          }
        } else if (!isAbortError(ionResult.reason)) {
          console.error("Error loading ION sessions:", ionResult.reason);
        }

        if (localResult.status === "fulfilled") {
          setLocalSessions(localResult.value.sessions);
          if (localResult.value.count !== undefined) {
            setLocalCount(localResult.value.count);
          }
        } else if (!isAbortError(localResult.reason)) {
          console.error("Error loading local sessions:", localResult.reason);
        }

        if (
          ionResult.status === "fulfilled" ||
          localResult.status === "fulfilled"
        ) {
          hasLoadedOnce.current = true;
        }
      } catch (error) {
        if (signal.aborted || disposed || isAbortError(error)) return;
        console.error("Error loading sessions:", error);
      } finally {
        if (!signal.aborted && !disposed) {
          setInitialLoad(false);
          setRefreshing(false);
        } else if (!disposed && hasLoadedOnce.current) {
          setRefreshing(false);
          setInitialLoad(false);
        }
        if (!disposed && !document.hidden) scheduleNextPoll();
      }
    };

    const onVisibilityChange = () => {
      if (disposed) return;
      if (document.hidden) {
        clearScheduledPoll();
        abortController?.abort();
        if (hasLoadedOnce.current) setRefreshing(false);
      } else {
        void runPollCycle();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void runPollCycle();

    return () => {
      disposed = true;
      clearScheduledPoll();
      abortController?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const mergedSessions = useMemo(
    () => mergeAndSortSessions(ionSessions, localSessions),
    [ionSessions, localSessions],
  );

  const allCount = useMemo((): TabCountValue => {
    if (ionCount === null || localCount === null) return null;
    return ionCount + localCount;
  }, [ionCount, localCount]);

  const filteredSessions = useMemo(() => {
    if (filter === "all") return mergedSessions;
    return mergedSessions.filter((row) => row.sourceType === filter);
  }, [mergedSessions, filter]);

  const showSkeleton =
    initialLoad && ionSessions.length === 0 && localSessions.length === 0;

  return (
    <div className="mt-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Active Sessions</CardTitle>
          {refreshing && (
            <Loader2
              className="h-4 w-4 animate-spin text-muted-foreground"
              aria-hidden
            />
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(value) => {
              if (value === "all" || value === "ion" || value === "local") {
                setFilter(value);
              }
            }}
            className="justify-start"
            size="sm"
            variant="outline"
          >
            <SessionFilterTab value="all" label="All" count={allCount} />
            <SessionFilterTab value="ion" label="ION" count={ionCount} />
            <SessionFilterTab value="local" label="Local" count={localCount} />
          </ToggleGroup>

          <TooltipProvider delayDuration={300}>
            <div className="overflow-auto max-h-[28rem]">
              {/* TODO: virtualize if row count grows */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Start Date/Time
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Session ID
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Location
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Charger
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Connector
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Energy (KWH)
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Amount (JOD)
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      User / Mobile
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {showSkeleton ? (
                    <TableSkeleton columns={COLUMNS} />
                  ) : filteredSessions.length > 0 ? (
                    filteredSessions.map((session) => (
                      <tr
                        key={mergedSessionKey(session)}
                        className="border-b border-border last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-3 px-2">
                          <SessionTypeBadge sourceType={session.sourceType} />
                        </td>
                        <td className="py-3 px-2">
                          {formatDate(session["Start Date/Time"])}
                        </td>
                        <td className="py-3 px-2 font-mono">
                          {formatSessionId(session["Session ID"])}
                        </td>
                        <td className="py-3 px-2">{session.Location}</td>
                        <td className="py-3 px-2">{session.Charger}</td>
                        <td className="py-3 px-2">{session.Connector}</td>
                        <td className="py-3 px-2">
                          {session["Energy (KWH)"]?.toFixed(2) || "0.00"}
                        </td>
                        <td className="py-3 px-2">
                          {session["Amount (JOD)"]?.toFixed(2) || "0.00"}
                        </td>
                        <td className="py-3 px-2">
                          {session.sourceType === "ion"
                            ? session.mobile || "-"
                            : session["User ID"] || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={COLUMNS}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No active sessions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
};
