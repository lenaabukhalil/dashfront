import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLiveActivity, type LiveActivityData } from "@/services/api";
import { isAbortError } from "@/features/users/live-activity/liveActivityShared";

export function useLiveActivityPoll(
  pollIntervalMs: number,
  loadErrorLabel: string,
  refreshErrorLabel: string,
) {
  const [data, setData] = useState<LiveActivityData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const dataRef = useRef<LiveActivityData | null>(null);
  dataRef.current = data;

  const load = useCallback(
    async (signal: AbortSignal) => {
      try {
        const res = await fetchLiveActivity({ signal });
        if (signal.aborted) return;
        if (res.success && res.data) {
          setData(res.data);
          setRefreshError(null);
        } else {
          throw new Error("Live activity unavailable");
        }
      } catch (error) {
        if (signal.aborted || isAbortError(error)) return;
        if (!dataRef.current) {
          setRefreshError(loadErrorLabel);
        } else {
          setRefreshError(refreshErrorLabel);
        }
      } finally {
        if (!signal.aborted) setInitialLoading(false);
      }
    },
    [loadErrorLabel, refreshErrorLabel],
  );

  useEffect(() => {
    let inFlight: AbortController | null = null;

    const run = () => {
      inFlight?.abort();
      inFlight = new AbortController();
      void load(inFlight.signal);
    };

    run();
    const id = window.setInterval(run, pollIntervalMs);

    return () => {
      window.clearInterval(id);
      inFlight?.abort();
    };
  }, [load, pollIntervalMs]);

  return { data, initialLoading, refreshError };
}
