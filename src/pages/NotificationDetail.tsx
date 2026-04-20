import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, type Notification } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  fetchChargerNotifications,
  fetchNotificationReadersApi,
  markNotificationAsReadApi,
  type ChargerNotificationItem,
  type NotificationReaderRow,
} from "@/services/api";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const cardSurface = "border border-border bg-card shadow-sm";

/** Placeholder only for `undefined`, `null`, empty string, or whitespace-only. */
function displayField(value: string | undefined | null): string {
  if (value === undefined || value === null) return "—";
  const s = String(value).trim();
  return s.length > 0 ? s : "—";
}

function formatDetailTime(n: ChargerNotificationItem): string {
  if (n.timestamp != null && Number.isFinite(Number(n.timestamp))) {
    return new Date(Number(n.timestamp)).toLocaleString();
  }
  if (n.createdAt != null && String(n.createdAt).trim() !== "") {
    const s = String(n.createdAt).trim();
    const normalized = s.includes("T") ? s : s.replace(" ", "T");
    const d = new Date(normalized);
    if (Number.isFinite(d.getTime())) return d.toLocaleString();
  }
  return "—";
}

function chargerHeading(n: ChargerNotificationItem): string {
  const name = displayField(n.chargerName);
  if (name !== "—") return name;
  if (n.chargerId != null && String(n.chargerId).trim() !== "")
    return `Charger ${String(n.chargerId).trim()}`;
  return "Notification";
}

function storeNotificationToItem(n: Notification): ChargerNotificationItem {
  const online =
    n.type === "success" ? true : n.type === "info" ? false : undefined;
  return {
    id: n.id,
    timestamp: n.timestamp.getTime(),
    createdAt: n.timestamp.toISOString(),
    message: n.message,
    online,
    chargerId: n.chargerId,
    chargerName: n.chargerName,
    organizationName: n.organizationName,
    locationName: n.locationName,
    read: n.read,
    isNew: n.isNew,
  };
}

const NotificationDetail = () => {
  const { notificationId: rawParam } = useParams<{ notificationId: string }>();
  const notificationId = rawParam ? decodeURIComponent(rawParam) : "";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState<ChargerNotificationItem | null>(null);
  const [tab, setTab] = useState("details");

  const [readers, setReaders] = useState<NotificationReaderRow[]>([]);
  const [readersLoading, setReadersLoading] = useState(false);

  useEffect(() => {
    if (!notificationId) return;
    const uid = user?.id ?? user?.user_id;
    if (uid == null || uid === "") return;
    void markNotificationAsReadApi(notificationId, uid);
  }, [notificationId, user?.id, user?.user_id]);

  useEffect(() => {
    if (!notificationId) {
      setNotif(null);
      setLoading(false);
      return;
    }
    const cached = notifications.find((n) => n.id === notificationId);
    if (cached) {
      setNotif(storeNotificationToItem(cached));
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const uid = user?.id ?? user?.user_id;
        const { items } = await fetchChargerNotifications({
          since: 0,
          userId: uid,
        });
        if (cancelled) return;
        const found =
          items.find((n) => String(n.id ?? "").trim() === notificationId) ?? null;
        setNotif(found);
      } catch {
        if (!cancelled) setNotif(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notificationId, user?.id, user?.user_id, notifications]);

  useEffect(() => {
    if (notif) {
      console.log("[NotificationDetail] full notification object:", notif);
    }
  }, [notif]);

  const loadReaders = useCallback(async () => {
    if (!notificationId) return;
    setReadersLoading(true);
    try {
      const rows = await fetchNotificationReadersApi(notificationId);
      setReaders(rows);
    } catch {
      setReaders([]);
    } finally {
      setReadersLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    if (tab === "readers") loadReaders();
  }, [tab, loadReaders]);

  const heading = useMemo(
    () => (notif ? chargerHeading(notif) : "Notification"),
    [notif],
  );

  const statusBadge =
    notif?.online === true ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Online
      </span>
    ) : notif?.online === false ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Offline
      </span>
    ) : (
      <span className="text-sm text-muted-foreground">—</span>
    );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
              {loading ? "Notification" : heading}
            </h1>
            {!loading && notif && (
              <div className="space-y-0.5 text-sm text-muted-foreground">
                <p>
                  <span className="text-foreground/80">Organization:</span>{" "}
                  {displayField(notif.organizationName ?? undefined)}
                </p>
                <p>
                  <span className="text-foreground/80">Location:</span>{" "}
                  {displayField(notif.locationName ?? undefined)}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground pt-0.5">
              Notification details and read audit
            </p>
          </div>
        </div>

        <PermissionGuard
          permission="notifications"
          action="read"
          fallback={
            <Card className={cn(cardSurface, "rounded-lg")}>
              <CardContent className="py-8">
                <EmptyState
                  title="Access denied"
                  description="You don't have permission to view notifications."
                />
              </CardContent>
            </Card>
          }
        >
          {loading ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !notif ? (
            <Card className={cn(cardSurface, "rounded-lg")}>
              <CardContent className="py-8">
                <EmptyState
                  title="Not found"
                  description="This notification could not be loaded. It may have been removed or the link is invalid."
                />
              </CardContent>
            </Card>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <PermissionGuard
                  permission="notifications"
                  action="write"
                  fallback={null}
                >
                  <TabsTrigger value="readers">Readers</TabsTrigger>
                </PermissionGuard>
              </TabsList>

              <TabsContent value="details" className="mt-0">
                <Card className={cn(cardSurface, "rounded-lg")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Notification</CardTitle>
                    <CardDescription>
                      Charger status event and context
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-0 text-sm">
                    <dl className="divide-y divide-border rounded-lg border border-border bg-muted/20">
                      <div className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:items-center">
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Charger
                        </dt>
                        <dd className="font-medium text-foreground">
                          {displayField(notif.chargerName) !== "—"
                            ? displayField(notif.chargerName)
                            : notif.chargerId != null &&
                                String(notif.chargerId).trim() !== ""
                              ? String(notif.chargerId).trim()
                              : "—"}
                        </dd>
                      </div>
                      <div className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:items-center">
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Organization
                        </dt>
                        <dd className="text-foreground">
                          {displayField(notif.organizationName ?? undefined)}
                        </dd>
                      </div>
                      <div className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:items-center">
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Location
                        </dt>
                        <dd className="text-foreground">
                          {displayField(notif.locationName ?? undefined)}
                        </dd>
                      </div>
                      <div className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:items-start">
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground pt-0.5">
                          Status
                        </dt>
                        <dd>{statusBadge}</dd>
                      </div>
                      <div className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:items-center">
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Time
                        </dt>
                        <dd className="tabular-nums text-foreground">
                          {formatDetailTime(notif)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                        Message
                      </p>
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {notif.message ??
                          (notif.online
                            ? "Charger is online"
                            : notif.online === false
                              ? "Charger is offline"
                              : "—")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <PermissionGuard
                permission="notifications"
                action="write"
                fallback={null}
              >
                <TabsContent value="readers" className="mt-0">
                  <Card className={cn(cardSurface, "rounded-lg")}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Readers</CardTitle>
                      <CardDescription>
                        Users who opened this notification (mark-read audit)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {readersLoading ? (
                        <div className="flex justify-center py-12 text-muted-foreground">
                          <Loader2 className="h-7 w-7 animate-spin" />
                        </div>
                      ) : readers.length === 0 ? (
                        <EmptyState
                          title="No readers yet"
                          description="No read events recorded for this notification, or the list is not available."
                        />
                      ) : (
                        <div className="rounded-lg border border-border overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/40">
                                <th className="text-left p-3 font-medium">
                                  User Name
                                </th>
                                <th className="text-left p-3 font-medium">Email</th>
                                <th className="text-left p-3 font-medium">Role</th>
                                <th className="text-left p-3 font-medium whitespace-nowrap">
                                  Read At
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {readers.map((r, i) => (
                                <tr
                                  key={`${r.email}-${i}`}
                                  className="border-b border-border last:border-0"
                                >
                                  <td className="p-3">{r.userName}</td>
                                  <td className="p-3 text-muted-foreground">
                                    {r.email}
                                  </td>
                                  <td className="p-3">{r.role}</td>
                                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                                    {r.readAtDisplay}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </PermissionGuard>
            </Tabs>
          )}
        </PermissionGuard>
      </div>
    </DashboardLayout>
  );
};

export default NotificationDetail;
