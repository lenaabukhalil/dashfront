import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  markNotificationAsReadApi,
  markNotificationsSeenApi,
  fetchChargerNotifications,
} from "@/services/api";
import { useTheme } from "next-themes";
import { Link, useNavigate } from "react-router-dom";
import { Bell, User, Moon, Sun, Menu, Sparkles } from "lucide-react";
import { useIsSidebarDrawer } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const getUserTypeLabel = (userType: number) => {
  switch (userType) {
    case 1:
      return "Admin";
    case 2:
      return "Operator";
    case 3:
      return "Accountant";
    default:
      return "User";
  }
};

const getUserTypeColor = (userType: number) => {
  switch (userType) {
    case 1:
      return "bg-red-500";
    case 2:
      return "bg-blue-500";
    case 3:
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { user } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const {
    notifications,
    unreadCount,
    markAsRead,
    removeNotification,
    mergeNotificationsFromApi,
  } = useNotifications();
  const navigate = useNavigate();
  const isSidebarDrawer = useIsSidebarDrawer();
  const { t } = useLanguage();

  const isDark = resolvedTheme === "dark";
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const loadNotificationsHistory = async () => {
    try {
      const uid = user?.id ?? user?.user_id;
      const { items, unreadCount } = await fetchChargerNotifications({
        since: 0,
        userId: uid,
      });
      mergeNotificationsFromApi(items, unreadCount);
    } catch {
      // ignore
    }
  };

  const markAllSeenAndRefresh = async () => {
    const uid = user?.id ?? user?.user_id;
    if (uid == null || uid === "") return;
    try {
      const seen = await markNotificationsSeenApi(uid);
      if (seen.success) mergeNotificationsFromApi([], 0);
    } catch {
      // ignore
    }
    await loadNotificationsHistory();
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
        {isSidebarDrawer && onMenuClick ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="lg:hidden shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-0 shrink-0 lg:w-0" aria-hidden />
        )}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/setup-wizard")}
                aria-label={t("header.setupWizard")}
              >
                <Sparkles className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("header.setupWizard")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isDark ? t("header.lightMode") : t("header.darkMode")}
            </TooltipContent>
          </Tooltip>

          <Popover
            open={notificationsOpen}
            onOpenChange={async (open) => {
              setNotificationsOpen(open);
              if (!open) return;
              const uid = user?.id ?? user?.user_id;
              if (uid != null && uid !== "") {
                try {
                  const seen = await markNotificationsSeenApi(uid);
                  if (seen.success) mergeNotificationsFromApi([], 0);
                } catch {
                  // ignore
                }
              }
              await loadNotificationsHistory();
            }}
          >
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
                <span className="sr-only">{t("header.notifications")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between gap-2 p-4 border-b">
                <h3 className="font-semibold text-sm">{t("header.notifications")}</h3>
                {unreadCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 text-xs"
                    onClick={() => void markAllSeenAndRefresh()}
                  >
                    {t("header.markAllRead")}
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[400px]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {t("header.noNotifications")}
                  </div>
                ) : (
                  <div className="p-2">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors mb-1 border-l-4 pl-3",
                          !notification.read && "border-l-primary bg-muted/30",
                          notification.read &&
                            notification.isNew &&
                            "border-l-primary/25 bg-muted/15",
                          notification.read &&
                            !notification.isNew &&
                            "border-l-transparent opacity-55",
                        )}
                        onClick={async () => {
                          markAsRead(notification.id); // تحديث الواجهة فوراً
                          const uid = user?.id ?? user?.user_id;
                          if (uid != null && uid !== "") {
                            try {
                              await markNotificationAsReadApi(notification.id, uid);
                              const { items, unreadCount } =
                                await fetchChargerNotifications({
                                  since: 0,
                                  userId: uid,
                                });
                              mergeNotificationsFromApi(items, unreadCount);
                            } catch {
                              // ignore – الواجهة محدّثة محلياً
                            }
                          }
                          if (notification.action) {
                            notification.action.onClick();
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p
                                className={cn(
                                  "text-sm truncate",
                                  !notification.read && "font-semibold text-foreground",
                                  notification.read && "font-normal",
                                )}
                              >
                                {notification.title}
                              </p>
                              {notification.isNew && (
                                <span
                                  className={cn(
                                    "text-[10px] font-medium uppercase tracking-wide shrink-0",
                                    notification.read
                                      ? "text-muted-foreground"
                                      : "text-primary/80",
                                  )}
                                >
                                  New
                                </span>
                              )}
                            </div>
                            <p
                              className={cn(
                                "text-xs line-clamp-2",
                                notification.read
                                  ? "text-muted-foreground"
                                  : "text-foreground/90",
                              )}
                            >
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(notification.timestamp, {
                                  addSuffix: true,
                                })}
                              </p>
                              <Link
                                to={`/notifications/${encodeURIComponent(notification.id)}`}
                                className="text-xs text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Details
                              </Link>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/profile")}
                  aria-label="Profile"
                >
                  <User className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("header.profile")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
};

