/**
 * Real-time charger notifications over WebSocket.
 *
 * ## Auth-as-first-message protocol
 * 1. Client opens the socket to `/ws/notifications`.
 * 2. On `open`, immediately send `{ type: "auth", token: "<JWT>" }`.
 * 3. Server replies with `auth_ok` (connection live) or `auth_error` / `auth_required` (close).
 * 4. A 5s auth timeout closes the socket if `auth_ok` never arrives.
 *
 * ## Reconnect & catch-up
 * - On `close` / `error` / auth failure, schedule reconnect with exponential backoff + jitter.
 * - On `document.visibilitychange` → visible, reconnect immediately if the socket is not OPEN.
 * - After each successful `auth_ok`:
 *   - Start a 25s heartbeat (`ping` / `pong`) so nginx does not idle-close the connection.
 *   - Run a catch-up REST fetch (`fetchChargerNotifications({ since, userId })`) and merge into
 *     the bell. Toast catch-up items only when the session was already primed (reconnect), not on
 *     the first connection of the session (Header’s initial REST fetch primes seen ids).
 * - Live `notification` pushes are merged immediately and may trigger toasts.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  maxNotificationTimestampMs,
  toastNewChargerNotificationItems,
} from "@/lib/notification-toasts";
import {
  fetchChargerNotifications,
  getAuthToken,
  normalizeChargerNotificationItem,
  type ChargerNotificationItem,
} from "@/services/api";
import { getNotificationsWebSocketUrl } from "@/services/websocket-url";

const HEARTBEAT_INTERVAL_MS = 25_000;
const AUTH_TIMEOUT_MS = 5_000;
const BACKOFF_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000] as const;
const MAX_BACKOFF_MS = 30_000;

type WsOutboundMessage =
  | { type: "auth"; token: string }
  | { type: "ping" };

interface WsAuthOkMessage {
  type: "auth_ok";
  userId: number;
  orgId: number | null;
  isAdmin: boolean;
  serverTime: number;
}

interface WsAuthErrorMessage {
  type: "auth_error";
  message: string;
}

interface WsAuthRequiredMessage {
  type: "auth_required";
}

interface WsPongMessage {
  type: "pong";
  t: number;
}

interface WsNotificationPayload {
  id: string;
  chargerId: string;
  organizationId: number | null;
  locationId: number | null;
  online: boolean | null;
  message: string;
  level: "info" | "warning" | "error" | "critical";
  timestamp: number;
  eventType: string;
  ocppState?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}

interface WsNotificationMessage {
  type: "notification";
  data: WsNotificationPayload;
}

type WsInboundMessage =
  | WsAuthOkMessage
  | WsAuthErrorMessage
  | WsAuthRequiredMessage
  | WsPongMessage
  | WsNotificationMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseFiniteNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseNotificationLevel(
  value: unknown,
): WsNotificationPayload["level"] | undefined {
  if (value === "info" || value === "warning" || value === "error" || value === "critical") {
    return value;
  }
  return undefined;
}

function parseWsNotificationPayload(raw: unknown): WsNotificationPayload | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : String(raw.id ?? "").trim();
  const chargerId =
    typeof raw.chargerId === "string" ? raw.chargerId : String(raw.chargerId ?? "").trim();
  const message = typeof raw.message === "string" ? raw.message : String(raw.message ?? "");
  const eventType =
    typeof raw.eventType === "string" ? raw.eventType : String(raw.eventType ?? "");
  const timestamp = parseFiniteNumber(raw.timestamp);
  const level = parseNotificationLevel(raw.level);
  if (!id || timestamp == null || level == null) return null;
  // Accept boolean for connectivity events, null for state events
  let online: boolean | null;
  if (raw.online === true || raw.online === false) {
    online = raw.online;
  } else if (raw.online === null || raw.online === undefined) {
    online = null;
  } else {
    return null;
  }
  const organizationId = parseFiniteNumber(raw.organizationId);
  const locationId = parseFiniteNumber(raw.locationId);
  const ocppState =
    typeof raw.ocppState === "string"
      ? raw.ocppState
      : raw.ocppState === null
      ? null
      : undefined;
  const oldValue =
    typeof raw.oldValue === "string"
      ? raw.oldValue
      : raw.oldValue === null
      ? null
      : undefined;
  const newValue =
    typeof raw.newValue === "string"
      ? raw.newValue
      : raw.newValue === null
      ? null
      : undefined;
  return {
    id,
    chargerId,
    organizationId,
    locationId,
    online,
    message,
    level,
    timestamp,
    eventType,
    ocppState,
    oldValue,
    newValue,
  };
}

function parseWsInboundMessage(raw: unknown): WsInboundMessage | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;

  switch (raw.type) {
    case "auth_ok": {
      const userId = parseFiniteNumber(raw.userId);
      const serverTime = parseFiniteNumber(raw.serverTime);
      if (userId == null || serverTime == null) return null;
      const orgIdRaw = raw.orgId;
      const orgId =
        orgIdRaw === null || orgIdRaw === undefined ? null : parseFiniteNumber(orgIdRaw);
      return {
        type: "auth_ok",
        userId,
        orgId,
        isAdmin: raw.isAdmin === true,
        serverTime,
      };
    }
    case "auth_error": {
      const message = typeof raw.message === "string" ? raw.message : String(raw.message ?? "");
      return { type: "auth_error", message };
    }
    case "auth_required":
      return { type: "auth_required" };
    case "pong": {
      const t = parseFiniteNumber(raw.t);
      if (t == null) return null;
      return { type: "pong", t };
    }
    case "notification": {
      const data = parseWsNotificationPayload(raw.data);
      if (!data) return null;
      return { type: "notification", data };
    }
    default:
      return null;
  }
}

function wsPayloadToChargerNotificationItem(
  payload: WsNotificationPayload,
): ChargerNotificationItem {
  return normalizeChargerNotificationItem({
    id: payload.id,
    chargerId: payload.chargerId,
    organizationId: payload.organizationId,
    locationId: payload.locationId,
    online: payload.online,
    message: payload.message,
    level: payload.level,
    timestamp: payload.timestamp,
    eventType: payload.eventType,
    ocppState: payload.ocppState,
  });
}

function getBackoffDelayMs(attempt: number): number {
  const index = Math.min(Math.max(attempt, 1), BACKOFF_DELAYS_MS.length) - 1;
  const base = Math.min(BACKOFF_DELAYS_MS[index] ?? 15_000, MAX_BACKOFF_MS);
  const jitterFactor = 0.8 + Math.random() * 0.4;
  return Math.round(base * jitterFactor);
}

function resolveUserId(user: { id: string; user_id?: number } | null): number | null {
  const raw = user?.user_id ?? user?.id ?? null;
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function useNotificationsWebSocket(): void {
  const { user } = useAuth();
  const { mergeNotificationsFromApi } = useNotifications();
  const userId = resolveUserId(user);

  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastEventTsRef = useRef(0);
  const sessionStartedAtRef = useRef(0);
  const notificationsPrimedRef = useRef(false);
  const userIdRef = useRef<number | null>(null);
  const mergeRef = useRef(mergeNotificationsFromApi);
  const connectRef = useRef<(() => void) | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    mergeRef.current = mergeNotificationsFromApi;
  }, [mergeNotificationsFromApi]);

  useEffect(() => {
    console.debug("[notifications-ws] effect re-run, userId:", userId);
    disposedRef.current = false;
    const token = getAuthToken();

    const clearHeartbeat = () => {
      if (heartbeatIntervalRef.current != null) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    const clearAuthTimeout = () => {
      if (authTimeoutRef.current != null) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
    };

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current != null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const closeSocket = () => {
      const socket = socketRef.current;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close();
        }
      }
      socketRef.current = null;
    };

    const scheduleReconnect = (reason: string) => {
      if (disposedRef.current || userIdRef.current == null || !getAuthToken()) return;
      clearReconnectTimeout();
      reconnectAttemptsRef.current += 1;
      const delayMs = getBackoffDelayMs(reconnectAttemptsRef.current);
      console.warn(
        `[notifications-ws] scheduling reconnect in ${delayMs}ms (attempt ${reconnectAttemptsRef.current}): ${reason}`,
      );
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connectRef.current?.();
      }, delayMs);
    };

    const runCatchUpFetch = async (shouldToast: boolean) => {
      const uid = userIdRef.current;
      if (uid == null) return;
      try {
        const since = lastEventTsRef.current > 0 ? lastEventTsRef.current : undefined;
        const { items, unreadCount } = await fetchChargerNotifications({
          since,
          userId: uid,
        });
        mergeRef.current(items, unreadCount);
        if (shouldToast && sessionStartedAtRef.current > 0) {
          toastNewChargerNotificationItems(items, sessionStartedAtRef.current);
        }
        const mx = maxNotificationTimestampMs(items);
        if (mx > 0) {
          lastEventTsRef.current = Math.max(lastEventTsRef.current, mx);
        }
      } catch (err: unknown) {
        console.warn("[notifications-ws] catch-up fetch failed:", err);
      }
    };

    const handleAuthOk = () => {
      clearAuthTimeout();
      reconnectAttemptsRef.current = 0;

      if (sessionStartedAtRef.current === 0) {
        sessionStartedAtRef.current = Date.now();
      }

      const wasPrimed = notificationsPrimedRef.current;
      notificationsPrimedRef.current = true;

      clearHeartbeat();
      heartbeatIntervalRef.current = setInterval(() => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        const ping: WsOutboundMessage = { type: "ping" };
        console.debug("[notifications-ws] ping");
        socket.send(JSON.stringify(ping));
      }, HEARTBEAT_INTERVAL_MS);

      void runCatchUpFetch(wasPrimed);
    };

    const handleInboundMessage = (message: WsInboundMessage) => {
      switch (message.type) {
        case "auth_ok":
          console.debug("[notifications-ws] auth_ok", {
            userId: message.userId,
            orgId: message.orgId,
          });
          handleAuthOk();
          break;
        case "auth_error":
          console.warn("[notifications-ws] auth_error:", message.message);
          closeSocket();
          break;
        case "auth_required":
          console.warn("[notifications-ws] auth_required");
          closeSocket();
          break;
        case "pong":
          console.debug("[notifications-ws] pong", message.t);
          break;
        case "notification": {
          const item = wsPayloadToChargerNotificationItem(message.data);
          console.debug("[notifications-ws] notification", item.id);
          mergeRef.current([item], undefined);
          if (sessionStartedAtRef.current > 0) {
            toastNewChargerNotificationItems([item], sessionStartedAtRef.current);
          }
          lastEventTsRef.current = Math.max(
            lastEventTsRef.current,
            message.data.timestamp,
          );
          break;
        }
        default: {
          const _exhaustive: never = message;
          void _exhaustive;
        }
      }
    };

    const connect = () => {
      if (disposedRef.current) return;
      const uid = userIdRef.current;
      const jwt = getAuthToken();
      if (uid == null || !jwt) return;

      const existing = socketRef.current;
      if (
        existing &&
        (existing.readyState === WebSocket.CONNECTING ||
          existing.readyState === WebSocket.OPEN)
      ) {
        return;
      }

      clearReconnectTimeout();
      closeSocket();
      clearHeartbeat();
      clearAuthTimeout();

      const url = getNotificationsWebSocketUrl();
      console.debug("[notifications-ws] connecting", url);

      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch (err: unknown) {
        console.error("[notifications-ws] failed to construct WebSocket:", err);
        scheduleReconnect("construct_error");
        return;
      }

      socketRef.current = socket;

      socket.onopen = () => {
        console.debug("[notifications-ws] open");
        const authMsg: WsOutboundMessage = { type: "auth", token: jwt };
        socket.send(JSON.stringify(authMsg));

        clearAuthTimeout();
        authTimeoutRef.current = setTimeout(() => {
          authTimeoutRef.current = null;
          console.warn("[notifications-ws] auth timeout — closing socket");
          closeSocket();
        }, AUTH_TIMEOUT_MS);
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data) as unknown;
        } catch {
          console.warn("[notifications-ws] invalid JSON message");
          return;
        }
        const message = parseWsInboundMessage(parsed);
        if (!message) {
          console.debug("[notifications-ws] ignored message", parsed);
          return;
        }
        handleInboundMessage(message);
      };

      socket.onerror = () => {
        console.warn("[notifications-ws] socket error");
      };

      socket.onclose = () => {
        console.debug("[notifications-ws] close");
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        clearHeartbeat();
        clearAuthTimeout();
        if (!disposedRef.current) {
          scheduleReconnect("close");
        }
      };
    };

    connectRef.current = connect;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) return;
      clearReconnectTimeout();
      reconnectAttemptsRef.current = 0;
      console.debug("[notifications-ws] tab visible — reconnecting");
      connect();
    };

    if (!userId || !token) {
      userIdRef.current = null;
      notificationsPrimedRef.current = false;
      sessionStartedAtRef.current = 0;
      lastEventTsRef.current = 0;
      reconnectAttemptsRef.current = 0;
      clearReconnectTimeout();
      clearHeartbeat();
      clearAuthTimeout();
      closeSocket();
      return () => {
        disposedRef.current = true;
        connectRef.current = null;
      };
    }

    const userChanged = userIdRef.current !== userId;
    userIdRef.current = userId;

    if (userChanged) {
      notificationsPrimedRef.current = false;
      sessionStartedAtRef.current = 0;
      lastEventTsRef.current = 0;
      reconnectAttemptsRef.current = 0;
      clearReconnectTimeout();
      closeSocket();
    }

    connect();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposedRef.current = true;
      connectRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearReconnectTimeout();
      clearHeartbeat();
      clearAuthTimeout();
      closeSocket();
    };
  }, [userId]);
}
