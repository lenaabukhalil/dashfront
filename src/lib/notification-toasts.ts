import { TOAST_WINDOW_MS } from "@/contexts/NotificationContext";
import { toast } from "@/hooks/use-toast";
import type { ChargerNotificationItem } from "@/services/api";

export { TOAST_WINDOW_MS };

/** Grace window after session start — formerly tied to poll interval + 5s. */
const SESSION_TOAST_GRACE_MS = 12_000 + 5_000;

export const MAX_SEEN_NOTIFICATION_IDS = 500;

let seenNotificationIds = new Set<string>();

export function normalizeEpochMs(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n < 1e12 ? n * 1000 : n;
}

/** Parse API timestamp / createdAt to epoch ms (UTC-safe for naive DB datetimes). */
export function parseNotificationEventMs(item: ChargerNotificationItem): number | null {
  const fromTs = normalizeEpochMs(item.timestamp);
  if (fromTs != null) return fromTs;
  if (item.createdAt == null || String(item.createdAt).trim() === "") return null;
  let iso = String(item.createdAt).trim();
  iso = iso.includes("T") ? iso : iso.replace(" ", "T");
  if (!/[zZ]$/.test(iso) && !/[+-]\d{2}:?\d{2}$/.test(iso)) {
    iso += "Z";
  }
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

export function isChargerOnlineOfflineNotification(item: ChargerNotificationItem): boolean {
  if (item.online === true || item.online === false) return true;
  const n = Number(item.online);
  return n === 0 || n === 1;
}

/**
 * State events: eventType="state" with ocppState in our supported set.
 * These come from the polling pipeline (Charging/Available/Faulted).
 */
export function isChargerStateNotification(item: ChargerNotificationItem): boolean {
  if (item.eventType !== "state") return false;
  const s = typeof item.ocppState === "string" ? item.ocppState : "";
  return s === "Charging" || s === "Available" || s === "Faulted";
}

/** Max event timestamp from API rows (ms); used for incremental `since` fetches. */
export function maxNotificationTimestampMs(items: ChargerNotificationItem[]): number {
  let max = 0;
  for (const raw of items) {
    const t = parseNotificationEventMs(raw);
    if (t != null) max = Math.max(max, t);
  }
  return max;
}

export function chargerNotificationItemId(item: ChargerNotificationItem): string {
  return item.id ?? `${item.timestamp ?? item.createdAt}-${item.chargerId}`;
}

export function isWithinToastWindow(item: ChargerNotificationItem, nowMs = Date.now()): boolean {
  const eventMs = parseNotificationEventMs(item);
  if (eventMs == null) return false;
  return nowMs - eventMs <= TOAST_WINDOW_MS;
}

export function markNotificationIdSeen(id: string): void {
  seenNotificationIds.add(id);
  if (seenNotificationIds.size > MAX_SEEN_NOTIFICATION_IDS) {
    const arr = [...seenNotificationIds];
    seenNotificationIds = new Set(arr.slice(-MAX_SEEN_NOTIFICATION_IDS));
  }
}

/** First load of a session: record ids silently so refresh does not toast. */
export function primeSeenNotificationIds(items: ChargerNotificationItem[]): void {
  for (const item of items) {
    markNotificationIdSeen(chargerNotificationItemId(item));
  }
}

/** Clear dedupe state when the logged-in user changes or logs out. */
export function resetNotificationToastState(): void {
  seenNotificationIds = new Set();
}

export function toastNewChargerNotificationItems(
  items: ChargerNotificationItem[],
  sessionStartedMs: number,
): void {
  for (const item of items) {
    const isConnectivity = isChargerOnlineOfflineNotification(item);
    const isState = isChargerStateNotification(item);
    if (!isConnectivity && !isState) continue;

    const id = chargerNotificationItemId(item);
    if (seenNotificationIds.has(id)) continue;

    const eventMs = parseNotificationEventMs(item);
    if (eventMs == null) continue;

    if (eventMs < sessionStartedMs - SESSION_TOAST_GRACE_MS) {
      markNotificationIdSeen(id);
      continue;
    }
    if (!isWithinToastWindow(item)) {
      markNotificationIdSeen(id);
      continue;
    }

    const cn = item.chargerName != null ? String(item.chargerName).trim() : "";
    const title =
      cn ||
      (item.chargerId != null && String(item.chargerId).trim() !== ""
        ? `Charger ${String(item.chargerId).trim()}`
        : "Charger");
    let description: string;
    if (isState) {
      // For state events, prefer the server-provided message; fall back per ocppState
      if (item.message && item.message.trim() !== "") {
        description = item.message;
      } else {
        switch (item.ocppState) {
          case "Charging":
            description = `${title} started charging`;
            break;
          case "Available":
            description = `${title} is now available`;
            break;
          case "Faulted":
            description = `${title} has a fault`;
            break;
          default:
            description = "Charger state changed";
        }
      }
    } else {
      // Connectivity (unchanged behavior)
      const online = item.online === true || Number(item.online) === 1;
      description =
        item.message ?? (online ? "Charger is online" : "Charger is offline");
    }
    toast({
      title,
      description,
    });
    markNotificationIdSeen(id);
  }
}
