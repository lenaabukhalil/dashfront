import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import type { ChargerNotificationItem } from "@/services/api";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, "id" | "read"> & { timestamp?: Date; id?: string; read?: boolean }
  ) => void;
  mergeNotificationsFromApi: (items: ChargerNotificationItem[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (
      notification: Omit<Notification, "id" | "read"> & {
        timestamp?: Date;
        id?: string;
        read?: boolean;
      }
    ) => {
      const newNotification: Notification = {
        ...notification,
        id: notification.id ?? `notif-${Date.now()}-${Math.random()}`,
        timestamp: notification.timestamp ?? new Date(),
        read: notification.read ?? false,
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

  const mergeNotificationsFromApi = useCallback((items: ChargerNotificationItem[]) => {
    if (!items.length) return;
    setNotifications((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      for (const item of items) {
        const id = item.id ?? `${item.timestamp ?? item.createdAt}-${item.chargerId}`;
        const title = item.chargerId ? `Charger ${item.chargerId}` : "Charger";
        const existing = byId.get(id);
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
        const apiRead = item.read === true || item.read === 1;
        const keepRead = existing?.read === true || apiRead;
        byId.set(id, {
          id,
          title,
          message: item.message ?? (item.online ? "Charger is online" : "Charger is offline"),
          type: (item.online ? "success" : "info") as NotificationType,
          timestamp: tsValid != null ? new Date(tsValid) : new Date(),
          read: keepRead,
        });
      }
      return [...byId.values()].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

