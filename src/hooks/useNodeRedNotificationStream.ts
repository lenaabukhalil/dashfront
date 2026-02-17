import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { fetchChargerNotifications } from "@/services/api";

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
  const { isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();
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

    const POLL_INTERVAL_MS = 15000;

    const poll = async () => {
      try {
        const list = await fetchChargerNotifications({
          since: lastPollTsRef.current || undefined,
        });
        list.forEach((item) => {
          const id = item.id || `${item.timestamp}-${item.chargerId}`;
          if (seenNotificationIds.has(id)) return;
          markSeen(id);
          if (item.timestamp)
            lastPollTsRef.current = Math.max(lastPollTsRef.current, item.timestamp);
          const title = item.chargerId ? `Charger ${item.chargerId}` : "Charger";
          addNotification({
            title,
            message:
              item.message || (item.online ? "Charger is online" : "Charger is offline"),
            type: item.online ? "success" : "info",
            timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
          });
        });
      } catch {
      }
      pollTimerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
      lastPollTsRef.current = 0;
    };
  }, [isAuthenticated, addNotification]);
}
