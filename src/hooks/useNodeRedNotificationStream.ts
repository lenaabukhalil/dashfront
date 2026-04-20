import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { fetchChargerNotifications } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const MAX_SEEN_IDS = 500;
let seenNotificationIds = new Set<string>();

function markSeen(id: string) {
  seenNotificationIds.add(id);
  if (seenNotificationIds.size > MAX_SEEN_IDS) {
    const arr = [...seenNotificationIds];
    seenNotificationIds = new Set(arr.slice(-MAX_SEEN_IDS));
  }
}

export function useNodeRedNotificationStream() {
  const { isAuthenticated, user } = useAuth();
  const { mergeNotificationsFromApi } = useNotifications();
  const pollTimerRef = useRef<number | null>(null);
  const lastPollTsRef = useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated) {
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
      lastPollTsRef.current = 0;
      seenNotificationIds = new Set();
      return;
    }

    const POLL_INTERVAL_MS = 60000; 
    const userId = user?.id ?? user?.user_id;

    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const poll = async () => {
      try {
        // First poll: last 24h only (avoids since=0 loading all history / 504). Later polls use max seen item ts.
        const since =
          lastPollTsRef.current > 0
            ? lastPollTsRef.current
            : Date.now() - MS_PER_DAY;
        const { items: list, unreadCount } = await fetchChargerNotifications({
          since,
          userId,
        });
        mergeNotificationsFromApi(list, unreadCount);
        const toEpochMs = (x: { timestamp?: number; createdAt?: string }): number | undefined => {
          if (x.timestamp != null && Number.isFinite(Number(x.timestamp)))
            return Number(x.timestamp);
          if (typeof x.createdAt === "string" && x.createdAt) {
            const t = new Date(x.createdAt).getTime();
            return Number.isFinite(t) ? t : undefined;
          }
          return undefined;
        };
        list.forEach((item) => {
          const id = item.id ?? `${item.timestamp ?? item.createdAt}-${item.chargerId}`;
          if (seenNotificationIds.has(id)) return;
          markSeen(id);
          const ts = toEpochMs(item);
          if (ts != null)
            lastPollTsRef.current = Math.max(lastPollTsRef.current, ts);
          const title = item.chargerId ? `Charger ${item.chargerId}` : "Charger";
          toast({
            title,
            description:
              item.message ?? (item.online ? "Charger is online" : "Charger is offline"),
          });
        });
      } catch {
        // ignore
      }
      pollTimerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
      lastPollTsRef.current = 0;
    };
  }, [isAuthenticated, user?.id, user?.user_id, mergeNotificationsFromApi]);
}
