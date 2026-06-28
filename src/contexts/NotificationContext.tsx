import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import {
  normalizeChargerNotificationItem,
  type ChargerNotificationItem,
  type NotificationReaderRow,
} from "@/services/api";
import { useNotificationsWebSocket } from "@/hooks/useNotificationsWebSocket";

function NotificationsWebSocketSubscriber() {
  useNotificationsWebSocket();
  return null;
}

export type NotificationType = "info" | "success" | "warning" | "error";

/** Toast pop-ups only for events within this window (bell list is not filtered). */
export const TOAST_WINDOW_MS = 2 * 60 * 60 * 1000;

const NEAR_DUPLICATE_WINDOW_MS = 90_000;

function notificationOnlineValue(item: { online?: boolean }): boolean | undefined {
  if (item.online === true || Number(item.online) === 1) return true;
  if (item.online === false || Number(item.online) === 0) return false;
  return undefined;
}

/** Latest API isNew only — not sticky (unlike read). */
function parseApiIsNew(item: ChargerNotificationItem): boolean {
  const raw = item as ChargerNotificationItem & { is_new?: unknown };
  const v = raw.isNew ?? raw.is_new;
  if (v === true || v === 1 || v === "1" || v === "true") return true;
  if (v === false || v === 0 || v === "0" || v === "false") return false;
  return false;
}

/** Parse authoritative readAt from API (epoch ms or date string). */
function parseReadAtMs(
  item: ChargerNotificationItem,
  existing?: Notification,
): number | null {
  const raw = item.readAt;
  if (raw == null || raw === "") return existing?.readAt ?? null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const asNum = Number(raw);
    if (Number.isFinite(asNum)) return asNum < 1e12 ? asNum * 1000 : asNum;
    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
    const d = new Date(normalized);
    return Number.isFinite(d.getTime()) ? d.getTime() : (existing?.readAt ?? null);
  }
  return existing?.readAt ?? null;
}

/** Temporary client-side guard for upstream duplicate charger_event_log rows. */
function collapseNearDuplicateNotifications(list: Notification[]): Notification[] {
  const normalized = list.map((n) => ({ ...n, id: String(n.id) }));
  const sorted = [...normalized].sort((a, b) => {
    const t = b.timestamp.getTime() - a.timestamp.getTime();
    if (t !== 0) return t;
    return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
  });
  const kept: Notification[] = [];
  for (const n of sorted) {
    const dupIdx = kept.findIndex(
      (k) =>
        String(k.chargerId ?? "") === String(n.chargerId ?? "") &&
        k.online === n.online &&
        k.message === n.message &&
        Math.abs(k.timestamp.getTime() - n.timestamp.getTime()) <= NEAR_DUPLICATE_WINDOW_MS
    );
    if (dupIdx >= 0) {
      kept[dupIdx] = {
        ...kept[dupIdx],
        read: kept[dupIdx].read || n.read,
        readAt: kept[dupIdx].readAt ?? n.readAt ?? null,
        isNew: kept[dupIdx].isNew,
      };
    } else {
      kept.push(n);
    }
  }
  return kept;
}

export interface Notification {
  id: string | number;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
  read: boolean;
  /** Epoch ms from server notification_reads (authoritative when present). */
  readAt: number | null;
  /** From API: created after last_seen_at */
  isNew: boolean;
  online?: boolean;
  chargerId?: string;
  chargerName?: string;
  organizationName?: string;
  locationName?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Event type: "connectivity" or "state" */
  eventType?: string;
  /** OCPP state for state events */
  ocppState?: string | null;
  /** Optional read-receipt rows (future Readers tab). */
  readers?: NotificationReaderRow[];
}

export interface MergeNotificationsFromApiOptions {
  /** Set only after mark-seen / mark-all-read — never on poll or empty fetch. */
  clearIsNewAfterMarkSeen?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, "id" | "read" | "isNew" | "timestamp"> & {
      timestamp?: Date;
      id?: string | number;
      read?: boolean;
      isNew?: boolean;
    }
  ) => void;
  mergeNotificationsFromApi: (
    items: ChargerNotificationItem[],
    unreadCount?: number,
    options?: MergeNotificationsFromApiOptions,
  ) => void;
  markAsRead: (id: string | number) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string | number) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const [hasServerUnreadCount, setHasServerUnreadCount] = useState(false);

  const unreadCount = useMemo(() => {
    if (hasServerUnreadCount) return serverUnreadCount;
    return notifications.filter((n) => n.isNew && !n.read).length;
  }, [hasServerUnreadCount, serverUnreadCount, notifications]);

  const addNotification = useCallback(
    (
      notification: Omit<Notification, "id" | "read" | "isNew" | "timestamp"> & {
        timestamp?: Date;
        id?: string | number;
        read?: boolean;
        isNew?: boolean;
      }
    ) => {
      const newNotification: Notification = {
        ...notification,
        id: notification.id ?? `notif-${Date.now()}-${Math.random()}`,
        timestamp: notification.timestamp ?? new Date(),
        read: notification.read ?? false,
        readAt: notification.readAt ?? null,
        isNew: notification.isNew ?? true,
      };

      setNotifications((prev) => [newNotification, ...prev]);

      toast({
        title: notification.title,
        description: notification.message,
        variant:
          notification.type === "error"
            ? "destructive"
            : notification.type === "success"
            ? "default"
            : "default",
      });

      setNotifications((prev) => prev.slice(0, 50));
    },
    []
  );

  const mergeNotificationsFromApi = useCallback(
    (
      items: ChargerNotificationItem[],
      unreadCountFromApi?: number,
      options?: MergeNotificationsFromApiOptions,
    ) => {
    if (typeof unreadCountFromApi === "number" && Number.isFinite(unreadCountFromApi)) {
      setHasServerUnreadCount(true);
      setServerUnreadCount(unreadCountFromApi);
    }
    if (options?.clearIsNewAfterMarkSeen) {
      setServerUnreadCount(0);
    }

    setNotifications((prev) => {
      if (!items.length) {
        if (options?.clearIsNewAfterMarkSeen && prev.length > 0) {
          return prev.map((n) => ({ ...n, isNew: false }));
        }
        return prev;
      }
      const byId = new Map(prev.map((n) => [String(n.id), n]));
      for (const raw of items) {
        const item = normalizeChargerNotificationItem(raw);
        const id = String(item.id ?? `${item.timestamp ?? item.createdAt}-${item.chargerId}`);
        const existing = byId.get(id);
        const orgName = item.organizationName ?? existing?.organizationName;
        const locName = item.locationName ?? existing?.locationName;
        const chgName = item.chargerName ?? existing?.chargerName;
        const chgId = item.chargerId ?? existing?.chargerId;
        const cn = chgName != null ? String(chgName).trim() : "";
        const title =
          cn ||
          (chgId != null && String(chgId).trim() !== ""
            ? `Charger ${String(chgId).trim()}`
            : "Charger");
        const tsNum =
          item.timestamp != null && Number.isFinite(Number(item.timestamp))
            ? Number(item.timestamp)
            : null;
        const ts =
          tsNum ??
          (typeof item.createdAt === "string" && item.createdAt
            ? new Date(item.createdAt).getTime()
            : null);
        const tsValid = ts != null && Number.isFinite(ts) ? ts : null;
        const serverRead = item.read === true || Number(item.read) === 1;
        const localRead = existing?.read === true;
        const finalRead = localRead || serverRead;
        const readAt = finalRead
          ? (parseReadAtMs(item, existing) ?? existing?.readAt ?? null)
          : (parseReadAtMs(item, existing) ?? null);
        let notifType: NotificationType;
        if (item.eventType === "state") {
          switch (item.ocppState) {
            case "Charging":
              notifType = "info";
              break;
            case "Available":
              notifType = "success";
              break;
            case "Faulted":
              notifType = "error";
              break;
            default:
              notifType = "info";
          }
        } else {
          notifType = (item.online ? "success" : "info") as NotificationType;
        }
        byId.set(id, {
          id,
          title,
          message: item.message ?? (item.online ? "Charger is online" : "Charger is offline"),
          type: notifType,
          timestamp: tsValid != null ? new Date(tsValid) : new Date(),
          read: finalRead,
          readAt,
          isNew: parseApiIsNew(item),
          online: notificationOnlineValue(item) ?? existing?.online,
          chargerId: chgId,
          chargerName: chgName,
          organizationName: orgName,
          locationName: locName,
          eventType: item.eventType,
          ocppState: item.ocppState,
        });
      }
      const collapsed = collapseNearDuplicateNotifications([...byId.values()]);
      return collapsed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
  },
  []);

  const markAsRead = useCallback((id: string | number) => {
    setNotifications((prev) => {
      const target = prev.find((n) => String(n.id) === String(id));
      if (target?.isNew && !target.read) {
        setServerUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.map((notif) =>
        String(notif.id) === String(id)
          ? { ...notif, read: true, readAt: notif.readAt ?? Date.now() }
          : notif,
      );
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setServerUnreadCount(0);
    setNotifications((prev) =>
      prev.map((notif) => ({
        ...notif,
        read: true,
        readAt: notif.readAt ?? Date.now(),
        isNew: false,
      })),
    );
  }, []);

  const removeNotification = useCallback((id: string | number) => {
    setNotifications((prev) => prev.filter((notif) => String(notif.id) !== String(id)));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setServerUnreadCount(0);
    setHasServerUnreadCount(false);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        mergeNotificationsFromApi,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
      }}
    >
      <NotificationsWebSocketSubscriber />
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

