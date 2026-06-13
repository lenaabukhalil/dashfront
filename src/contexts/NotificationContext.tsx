import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import {
  normalizeChargerNotificationItem,
  type ChargerNotificationItem,
} from "@/services/api";

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

/** Badge count — driven by isNew only (cleared by mark-seen, not by individual read). */
function countNewUnreadBadge(list: Notification[]): number {
  return list.filter((n) => n.isNew).length;
}

/** Temporary client-side guard for upstream duplicate charger_event_log rows. */
function collapseNearDuplicateNotifications(list: Notification[]): Notification[] {
  const sorted = [...list].sort((a, b) => {
    const t = b.timestamp.getTime() - a.timestamp.getTime();
    if (t !== 0) return t;
    return b.id.localeCompare(a.id);
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
        isNew: kept[dupIdx].isNew,
      };
    } else {
      kept.push(n);
    }
  }
  return kept;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
  read: boolean;
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
      id?: string;
      read?: boolean;
      isNew?: boolean;
    }
  ) => void;
  mergeNotificationsFromApi: (
    items: ChargerNotificationItem[],
    unreadCount?: number,
    options?: MergeNotificationsFromApiOptions,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = useMemo(
    () => countNewUnreadBadge(notifications),
    [notifications],
  );

  const addNotification = useCallback(
    (
      notification: Omit<Notification, "id" | "read" | "isNew" | "timestamp"> & {
        timestamp?: Date;
        id?: string;
        read?: boolean;
        isNew?: boolean;
      }
    ) => {
      const newNotification: Notification = {
        ...notification,
        id: notification.id ?? `notif-${Date.now()}-${Math.random()}`,
        timestamp: notification.timestamp ?? new Date(),
        read: notification.read ?? false,
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
      _unreadCountFromApi?: number,
      options?: MergeNotificationsFromApiOptions,
    ) => {
    setNotifications((prev) => {
      if (!items.length) {
        if (options?.clearIsNewAfterMarkSeen && prev.length > 0) {
          return prev.map((n) => ({ ...n, isNew: false }));
        }
        return prev;
      }
      const byId = new Map(prev.map((n) => [n.id, n]));
      for (const raw of items) {
        const item = normalizeChargerNotificationItem(raw);
        const id = item.id ?? `${item.timestamp ?? item.createdAt}-${item.chargerId}`;
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
        // لا نعيد read إلى false إذا المستخدم علّمها كمقروءة محلياً (حتى لو الـ API رجعت read: false)
        const apiRead = item.read === true || Number(item.read) === 1;
        const keepRead = existing?.read === true || apiRead;
        byId.set(id, {
          id,
          title,
          message: item.message ?? (item.online ? "Charger is online" : "Charger is offline"),
          type: (item.online ? "success" : "info") as NotificationType,
          timestamp: tsValid != null ? new Date(tsValid) : new Date(),
          read: keepRead,
          isNew: parseApiIsNew(item),
          online: notificationOnlineValue(item) ?? existing?.online,
          chargerId: chgId,
          chargerName: chgName,
          organizationName: orgName,
          locationName: locName,
        });
      }
      const collapsed = collapseNearDuplicateNotifications([...byId.values()]);
      return collapsed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
  },
  []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true, isNew: false }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
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

