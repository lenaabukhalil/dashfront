import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, type Notification } from "@/contexts/NotificationContext";
import {
  markNotificationAsReadApi,
  markNotificationsSeenApi,
  markNotificationsMarkAllReadApi,
  fetchChargerNotifications,
  getAuthToken,
} from "@/services/api";
import { useTheme } from "next-themes";
import { Link, useNavigate } from "react-router-dom";
import { Bell, User, Moon, Sun, Menu, Sparkles, LogOut } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  primeSeenNotificationIds,
  resetNotificationToastState,
} from "@/lib/notification-toasts";

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
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    mergeNotificationsFromApi,
  } = useNotifications();

  const connectivityNotifications = useMemo(
    () => notifications.filter((n) => n.eventType === "connectivity"),
    [notifications],
  );

  const navigate = useNavigate();
  const isSidebarDrawer = useIsSidebarDrawer();
  const { t } = useLanguage();

  const isDark = resolvedTheme === "dark";
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [initialNotificationPollDone, setInitialNotificationPollDone] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const userId = useMemo(() => {
    const uid = user?.user_id ?? user?.id;
    if (uid == null || uid === "") return null;
    return uid;
  }, [user?.user_id, user?.id]);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 0);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!userId || !getAuthToken()) {
      resetNotificationToastState();
      setInitialNotificationPollDone(true);
      return;
    }

    resetNotificationToastState();
    setInitialNotificationPollDone(false);

    const ac = new AbortController();
    fetchChargerNotifications({ userId, signal: ac.signal })
      .then(({ items, unreadCount: uc }) => {
        if (ac.signal.aborted) return;
        mergeNotificationsFromApi(items, uc);
        primeSeenNotificationIds(items);
        setInitialNotificationPollDone(true);
      })
      .catch(() => {
        if (!ac.signal.aborted) setInitialNotificationPollDone(true);
      });

    return () => ac.abort();
  }, [userId, mergeNotificationsFromApi]);

  const markAllSeenAndRefresh = async () => {
    const uid = user?.user_id ?? user?.id;
    if (uid == null || uid === "") return;
    const visibleIds = connectivityNotifications.map((n) => n.id);
    try {
      const read = await markNotificationsMarkAllReadApi(uid, visibleIds);
      if (read.success) {
        markAllAsRead();
      }
    } catch {
      // ignore
    }
    try {
      const { items, unreadCount: uc } = await fetchChargerNotifications({ userId: uid });
      mergeNotificationsFromApi(items, uc);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderNotificationsList = (list: Notification[]) => {
    if (!initialNotificationPollDone && list.length === 0) {
      return (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="p-8 text-center text-sm text-muted-foreground">
          {t("header.noNotifications")}
        </div>
      );
    }
    return (
      <div className="p-2">
        {list.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "p-3 rounded-lg hover:bg-muted transition-colors mb-1 border-l-4 pl-3",
              !notification.read && "border-l-primary bg-muted/30",
              notification.read && "border-l-transparent opacity-55",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p
                    className={cn(
                      "text-sm truncate",
                      !notification.read && "font-semibold text-foreground",
                      notification.read && "font-normal text-muted-foreground",
                    )}
                  >
                    {notification.title}
                  </p>
                  {notification.isNew && !notification.read && (
                    <span className="text-[10px] font-medium uppercase tracking-wide shrink-0 text-primary/80">
                      New
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-xs line-clamp-2",
                    notification.read ? "text-muted-foreground" : "text-foreground/90",
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
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                      const nid = String(notification.id ?? "").trim();
                      const uid = user?.user_id ?? user?.id;
                      if (
                        nid &&
                        uid != null &&
                        uid !== "" &&
                        Number.isFinite(Number(uid))
                      ) {
                        void markNotificationAsReadApi(nid, uid).catch(() => {
                          // optimistic UI already updated
                        });
                      }
                    }}
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
    );
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full bg-background transition-shadow duration-200",
        hasScrolled && "border-b border-border shadow-[0_2px_4px_rgba(0,0,0,0.05)]",
      )}
    >
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
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden truncate text-sm font-medium text-foreground sm:inline">
            ION CPO Dashboard
          </span>
          <span className="shrink-0 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            v{__APP_VERSION__}
          </span>
        </div>
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
              const uid = user?.user_id ?? user?.id;
              if (uid != null && uid !== "") {
                try {
                  const seen = await markNotificationsSeenApi(uid);
                  if (seen.success) {
                    mergeNotificationsFromApi([], undefined, { clearIsNewAfterMarkSeen: true });
                  }
                } catch {
                  // ignore
                }
              }
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
                {renderNotificationsList(connectivityNotifications)}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Profile">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => navigate("/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  {t("header.profile")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-950/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("sidebar.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};
