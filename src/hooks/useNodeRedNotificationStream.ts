import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, type NotificationType } from "@/contexts/NotificationContext";

type NodeRedNotificationEvent = {
  type?: string;
  title?: string;
  message?: string;
  level?: "info" | "success" | "warning" | "error";
  chargerId?: string | number;
  online?: boolean;
  timestamp?: string | number;
};

function getApiBaseUrl(): string {
  // Matches existing convention in src/services/api.ts
  return (import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:1880/api";
}

function toNotificationType(level: NodeRedNotificationEvent["level"]): NotificationType {
  if (level === "success") return "success";
  if (level === "warning") return "warning";
  if (level === "error") return "error";
  return "info";
}

/**
 * Connects to Node-RED Server-Sent Events endpoint and pushes notifications
 * into the app NotificationContext.
 *
 * Backend endpoint expected: GET {API_BASE_URL}/v4/notifications/stream
 * emitting events:
 *   event: notification
 *   data: {"title":"...","message":"...","level":"info"}
 */
export function useNodeRedNotificationStream() {
  const { isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();
  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryDelayMsRef = useRef<number>(2000);
  const lastProbeOkRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (esRef.current) esRef.current.close();
      esRef.current = null;
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
      retryDelayMsRef.current = 2000;
      lastProbeOkRef.current = false;
      return;
    }

    const base = getApiBaseUrl().replace(/\/+$/, "");
    const url = `${base}/v4/notifications/stream`;

    const scheduleReconnect = () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      const delay = retryDelayMsRef.current;
      retryTimerRef.current = window.setTimeout(connect, delay);
      // exponential backoff up to 60s
      retryDelayMsRef.current = Math.min(60000, Math.floor(retryDelayMsRef.current * 1.8));
    };

    const probeEndpoint = async (): Promise<boolean> => {
      // Avoid hammering the endpoint if it's missing (404) behind a proxy.
      // We probe with a short timeout, then only connect SSE when reachable.
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(url, { method: "GET", signal: controller.signal });
        // If the endpoint exists it should be 200 and keep-alive/streaming.
        // Any 4xx here usually means route/proxy not configured.
        return res.ok;
      } catch {
        return false;
      } finally {
        window.clearTimeout(t);
      }
    };

    const connect = () => {
      if (esRef.current) esRef.current.close();
      // First, probe the endpoint. If it's missing, back off quietly.
      probeEndpoint().then((ok) => {
        lastProbeOkRef.current = ok;
        if (!ok) {
          // Do not spam reconnections when endpoint is not present (404/timeout).
          scheduleReconnect();
          return;
        }

        retryDelayMsRef.current = 2000; // reset backoff after success
        const es = new EventSource(url);
        esRef.current = es;

        es.addEventListener("notification", (e) => {
          try {
            const data = JSON.parse((e as MessageEvent).data) as NodeRedNotificationEvent;
            const title =
              data.title ??
              (data.chargerId !== undefined
                ? `Charger ${data.chargerId}`
                : "Notification");
            const message =
              data.message ??
              (data.online === true
                ? "Charger is online"
                : data.online === false
                ? "Charger is offline"
                : "Update received");
            addNotification({
              title,
              message,
              type: toNotificationType(data.level),
            });
          } catch {
            // ignore malformed events
          }
        });

        es.onerror = () => {
          // Reconnect quietly with backoff (prevents "app feels like reload" effect)
          try {
            es.close();
          } catch {
            // ignore
          }
          esRef.current = null;
          scheduleReconnect();
        };
      });
    };

    connect();

    return () => {
      if (esRef.current) esRef.current.close();
      esRef.current = null;
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
      retryDelayMsRef.current = 2000;
      lastProbeOkRef.current = false;
    };
  }, [isAuthenticated, addNotification]);
}

