import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TOAST_WINDOW_MS, useNotifications } from "@/contexts/NotificationContext";
import {
  markNotificationAsReadApi,
  markNotificationsSeenApi,
  markNotificationsMarkAllReadApi,
  fetchChargerNotifications,
  type ChargerNotificationItem,
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChangelogSheet } from "@/components/shared/ChangelogSheet";
import { getChangelogUnread } from "@/config/changelog";

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

/**
 * Charger notification toast flow (Header poll → popup):
 * 1. First successful poll per session: record sessionStartedAt, prime all returned ids as "seen" (no toasts).
 * 2. Every NOTIFICATION_POLL_INTERVAL_MS: incremental fetch (`since` with overlap), merge into bell, then
 *    toastNewChargerNotificationItems for online/offline rows not yet seen, within TOAST_WINDOW_MS,
 *    and with event time at/after session start (avoids backlog toasts after a late/empty first poll).
 * 3. seenNotificationIds prevents duplicate toasts across polls; mark seen only after skip or successful toast.
 */
const NOTIFICATION_POLL_INTERVAL_MS = 12_000;
const SINCE_OVERLAP_MS = 30_000;

function normalizeEpochMs(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n < 1e12 ? n * 1000 : n;
}

/** Parse API timestamp / createdAt to epoch ms (UTC-safe for naive DB datetimes). */
function parseNotificationEventMs(item: ChargerNotificationItem): number | null {
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

function isChargerOnlineOfflineNotification(item: ChargerNotificationItem): boolean {
  if (item.online === true || item.online === false) return true;
  const n = Number(item.online);
  return n === 0 || n === 1;
}

/** Max event timestamp from API rows (ms); used for incremental `since` polls. */
function maxNotificationTimestampMs(items: ChargerNotificationItem[]): number {
  let max = 0;
  for (const raw of items) {
    const t = parseNotificationEventMs(raw);
    if (t != null) max = Math.max(max, t);
  }
  return max;
}

const MAX_SEEN_NOTIFICATION_IDS = 500;
let seenNotificationIds = new Set<string>();

function chargerNotificationItemId(item: ChargerNotificationItem): string {
  return item.id ?? `${item.timestamp ?? item.createdAt}-${item.chargerId}`;
}

function isWithinToastWindow(item: ChargerNotificationItem, nowMs = Date.now()): boolean {
  const eventMs = parseNotificationEventMs(item);
  if (eventMs == null) return false;
  return nowMs - eventMs <= TOAST_WINDOW_MS;
}

function markNotificationIdSeen(id: string) {
  seenNotificationIds.add(id);
  if (seenNotificationIds.size > MAX_SEEN_NOTIFICATION_IDS) {
    const arr = [...seenNotificationIds];
    seenNotificationIds = new Set(arr.slice(-MAX_SEEN_NOTIFICATION_IDS));
  }
}

/** First poll of a session: record ids silently so refresh does not toast. */
function primeSeenNotificationIds(items: ChargerNotificationItem[]) {
  for (const item of items) {
    markNotificationIdSeen(chargerNotificationItemId(item));
  }
}

function toastNewChargerNotificationItems(
  items: ChargerNotificationItem[],
  sessionStartedMs: number,
) {
  const sessionGraceMs = NOTIFICATION_POLL_INTERVAL_MS + 5_000;
  for (const item of items) {
    if (!isChargerOnlineOfflineNotification(item)) continue;

    const id = chargerNotificationItemId(item);
    if (seenNotificationIds.has(id)) continue;

    const eventMs = parseNotificationEventMs(item);
    if (eventMs == null) continue;

    if (eventMs < sessionStartedMs - sessionGraceMs) {
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
    const online =
      item.online === true || Number(item.online) === 1;
    toast({
      title,
      description:
        item.message ?? (online ? "Charger is online" : "Charger is offline"),
    });
    markNotificationIdSeen(id);
  }
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
  const navigate = useNavigate();
  const isSidebarDrawer = useIsSidebarDrawer();
  const { t } = useLanguage();

  const isDark = resolvedTheme === "dark";
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [initialNotificationPollDone, setInitialNotificationPollDone] = useState(false);
  const notificationsPollInFlightRef = useRef<AbortController | null>(null);
  const notificationsSinceRef = useRef(0);
  const notificationToastsPrimedRef = useRef(false);
  const notificationSessionStartedRef = useRef(0);
  const pollUserKeyRef = useRef<string | null>(null);
  const mergeNotificationsFromApiRef = useRef(mergeNotificationsFromApi);
  mergeNotificationsFromApiRef.current = mergeNotificationsFromApi;
  const userRef = useRef(user);
  userRef.current = user;
  const [hasScrolled, setHasScrolled] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [changelogRev, setChangelogRev] = useState(0);

  const changelogUnread = useMemo(() => {
    void changelogRev;
    return getChangelogUnread();
  }, [changelogRev]);

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

  const pollNotifications = useCallback(async () => {
    const uid = userRef.current?.user_id ?? userRef.current?.id;
    if (uid == null || uid === "") return;
    if (notificationsPollInFlightRef.current) return;
    const ac = new AbortController();
    notificationsPollInFlightRef.current = ac;
    try {
      const since =
        notificationsSinceRef.current > 0
          ? Math.max(0, notificationsSinceRef.current - SINCE_OVERLAP_MS)
          : undefined;
      const { items, unreadCount } = await fetchChargerNotifications({
        since,
        userId: uid,
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;
      mergeNotificationsFromApiRef.current(items, unreadCount);
      if (!notificationToastsPrimedRef.current) {
        notificationSessionStartedRef.current = Date.now();
        primeSeenNotificationIds(items);
        notificationToastsPrimedRef.current = true;
      } else {
        toastNewChargerNotificationItems(items, notificationSessionStartedRef.current);
      }
      const mx = maxNotificationTimestampMs(items);
      if (mx > 0) notificationsSinceRef.current = Math.max(notificationsSinceRef.current, mx);
    } catch (e: unknown) {
      const aborted =
        (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      if (!aborted) console.warn("[notifications] poll failed:", e);
    } finally {
      if (notificationsPollInFlightRef.current === ac) notificationsPollInFlightRef.current = null;
      if (!ac.signal.aborted) setInitialNotificationPollDone(true);
    }
  }, []);

  const pollUserKey = useMemo(() => {
    const uid = user?.user_id ?? user?.id;
    if (uid == null || uid === "") return null;
    return String(uid);
  }, [user?.user_id, user?.id]);

  useEffect(() => {
    if (!pollUserKey) {
      pollUserKeyRef.current = null;
      notificationsSinceRef.current = 0;
      notificationToastsPrimedRef.current = false;
      notificationSessionStartedRef.current = 0;
      seenNotificationIds = new Set();
      setInitialNotificationPollDone(true);
      return;
    }
    const userChanged = pollUserKeyRef.current !== pollUserKey;
    pollUserKeyRef.current = pollUserKey;
    if (userChanged) {
      notificationsSinceRef.current = 0;
      notificationToastsPrimedRef.current = false;
      notificationSessionStartedRef.current = 0;
      seenNotificationIds = new Set();
      setInitialNotificationPollDone(false);
    }
    void pollNotifications();
    const id = window.setInterval(() => void pollNotifications(), NOTIFICATION_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      notificationsPollInFlightRef.current?.abort();
      notificationsPollInFlightRef.current = null;
    };
  }, [pollUserKey, pollNotifications]);

  const markAllSeenAndRefresh = async () => {
    const uid = user?.id ?? user?.user_id;
    if (uid == null || uid === "") return;
    try {
      const read = await markNotificationsMarkAllReadApi(uid);
      if (read.success) {
        markAllAsRead();
      }
    } catch {
      // ignore
    }
    notificationsSinceRef.current = 0;
    try {
      const { items, unreadCount } = await fetchChargerNotifications({ userId: uid });
      mergeNotificationsFromApi(items, unreadCount);
      const mx = maxNotificationTimestampMs(items);
      if (mx > 0) notificationsSinceRef.current = mx;
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
                {!initialNotificationPollDone && notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {t("header.noNotifications")}
                  </div>
                ) : (
                  <div className="p-2">
                    {notifications.map((notification) => (
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
                                  const nid =
                                    notification.id?.trim?.() ??
                                    String(notification.id ?? "").trim();
                                  const uid = user?.id ?? user?.user_id;
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
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <ChangelogSheet
            open={changelogOpen}
            onOpenChange={setChangelogOpen}
            onMarkedRead={() => setChangelogRev((n) => n + 1)}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "relative h-8 shrink-0 gap-1.5 rounded-full border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted/80",
                )}
                onClick={() => setChangelogOpen(true)}
                aria-label="What's new in ION Dashboard"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                <span className="hidden sm:inline">What&apos;s new</span>
                {changelogUnread ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
                    aria-hidden
                  />
                ) : null}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">What&apos;s new</TooltipContent>
          </Tooltip>

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

