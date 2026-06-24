import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import {
  fetchChargingUserDetail,
  fetchChargingUserPayments,
  fetchChargingUserSessions,
  type ChargingUserDetail as ChargingUserDetailData,
  type ChargingUserPlatform,
  type ChargingUserPayment,
  type ChargingUserSession,
} from "@/services/api";
import { Apple, ChevronLeft, ChevronRight, Loader2, Smartphone, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const SESSIONS_PAGE_SIZE = 10;
const PAYMENTS_PAGE_SIZE = 10;

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatAmount(value: number | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "-";
}

function formatEnergy(value: number | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "-";
}

function displayValue(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "-";
  return String(value).trim();
}

function formatPlatformLabel(platform: ChargingUserPlatform | undefined): string {
  if (platform == null) return "-";
  if (platform === "android") return "Android";
  if (platform === "ios") return "iOS";
  if (platform === "huawei") return "Huawei";
  return "-";
}

function PlatformIcon({ platform }: { platform: ChargingUserPlatform }) {
  if (platform === "ios") {
    return <Apple className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
  if (platform === "android" || platform === "huawei") {
    return <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
  return null;
}

function statusBadgeClass(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "active") {
    return "border-transparent bg-emerald-600/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
  }
  if (s === "suspended") {
    return "border-transparent bg-amber-600/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200";
  }
  if (s === "disabled") {
    return "border-transparent bg-red-600/15 text-red-800 dark:bg-red-500/20 dark:text-red-300";
  }
  return "";
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <Badge
      variant={verified ? "default" : "secondary"}
      className={cn(
        "text-[10px] px-1.5 py-0",
        !verified && "text-muted-foreground",
      )}
    >
      {verified ? "Yes" : "No"}
    </Badge>
  );
}

interface ChargingUserDetailProps {
  userId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChargingUserDetail({
  userId,
  open,
  onOpenChange,
}: ChargingUserDetailProps) {
  const { dir, t } = useLanguage();
  const [detail, setDetail] = useState<ChargingUserDetailData | null>(null);
  const [sessions, setSessions] = useState<ChargingUserSession[]>([]);
  const [payments, setPayments] = useState<ChargingUserPayment[]>([]);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [isCurrentlyCharging, setIsCurrentlyCharging] = useState(false);

  const sessionsPageCount = Math.max(1, Math.ceil(sessionsTotal / SESSIONS_PAGE_SIZE));
  const safeSessionsPage = Math.min(Math.max(1, sessionsPage), sessionsPageCount);
  const sessionsStart = sessionsTotal === 0 ? 0 : (safeSessionsPage - 1) * SESSIONS_PAGE_SIZE + 1;
  const sessionsEnd = Math.min(safeSessionsPage * SESSIONS_PAGE_SIZE, sessionsTotal);
  const sessionsRangeText = `${sessionsStart}-${sessionsEnd} of ${sessionsTotal}`;

  const paymentsPageCount = Math.max(1, Math.ceil(paymentsTotal / PAYMENTS_PAGE_SIZE));
  const safePaymentsPage = Math.min(Math.max(1, paymentsPage), paymentsPageCount);
  const paymentsStart = paymentsTotal === 0 ? 0 : (safePaymentsPage - 1) * PAYMENTS_PAGE_SIZE + 1;
  const paymentsEnd = Math.min(safePaymentsPage * PAYMENTS_PAGE_SIZE, paymentsTotal);
  const paymentsRangeText = `${paymentsStart}-${paymentsEnd} of ${paymentsTotal}`;

  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  useEffect(() => {
    setSessionsPage(1);
    setPaymentsPage(1);
  }, [userId, open]);

  useEffect(() => {
    setSessionsPage((p) => Math.min(Math.max(1, p), sessionsPageCount));
  }, [sessionsPageCount]);

  useEffect(() => {
    setPaymentsPage((p) => Math.min(Math.max(1, p), paymentsPageCount));
  }, [paymentsPageCount]);

  useEffect(() => {
    if (!open || userId == null || !Number.isFinite(userId)) {
      setDetail(null);
      setSessions([]);
      setSessionsTotal(0);
      setSessionsError(null);
      setIsCurrentlyCharging(false);
      setPayments([]);
      setPaymentsTotal(0);
      setPaymentsError(null);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const data = await fetchChargingUserDetail(userId);
        if (!cancelled) setDetail(data);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const loadSessions = useCallback(async () => {
    if (!open || userId == null || !Number.isFinite(userId)) return;

    const offset = (sessionsPage - 1) * SESSIONS_PAGE_SIZE;
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const result = await fetchChargingUserSessions(userId, {
        limit: SESSIONS_PAGE_SIZE,
        offset,
      });
      setSessions(result.data);
      setSessionsTotal(result.total);
      if (sessionsPage === 1) {
        setIsCurrentlyCharging(
          result.data.length > 0 && result.data[0].end_date === null,
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load sessions";
      setSessionsError(message);
      setSessions([]);
      setSessionsTotal(0);
      if (sessionsPage === 1) {
        setIsCurrentlyCharging(false);
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSessionsLoading(false);
    }
  }, [open, userId, sessionsPage]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const loadPayments = useCallback(async () => {
    if (!open || userId == null || !Number.isFinite(userId)) return;

    const offset = (paymentsPage - 1) * PAYMENTS_PAGE_SIZE;
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const result = await fetchChargingUserPayments(userId, {
        limit: PAYMENTS_PAGE_SIZE,
        offset,
      });
      setPayments(result.data);
      setPaymentsTotal(result.total);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load payments";
      setPaymentsError(message);
      setPayments([]);
      setPaymentsTotal(0);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPaymentsLoading(false);
    }
  }, [open, userId, paymentsPage]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const fullName =
    detail != null
      ? [detail.first_name, detail.last_name].filter(Boolean).join(" ").trim() || "Charging User"
      : "Charging User";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="text-left space-y-2 pb-4">
          {detailLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading user…</span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <SheetTitle>{fullName}</SheetTitle>
                {detail?.status ? (
                  <Badge
                    variant="outline"
                    className={cn("font-medium", statusBadgeClass(detail.status))}
                  >
                    {detail.status}
                  </Badge>
                ) : null}
              </div>
              <SheetDescription>
                {detail?.mobile ? displayValue(detail.mobile) : "ION charging user profile"}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {isCurrentlyCharging && !sessionsLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <Zap className="size-4 shrink-0" aria-hidden />
            <span
              className="size-2 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"
              aria-hidden
            />
            {t("users.liveActivity.currentlyCharging")}
          </div>
        ) : null}

        <div className="space-y-6 pb-6">
          <section>
            <h3 className="text-sm font-semibold mb-3">Profile</h3>
            {detailLoading ? (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : !detail ? (
              <EmptyState title="Not found" description="User details could not be loaded." />
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd>{displayValue(detail.email)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">MSISDN</dt>
                  <dd>{displayValue(detail.msisdn)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Language</dt>
                  <dd>{displayValue(detail.language)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Balance (JOD)</dt>
                  <dd>{formatAmount(detail.balance)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created</dt>
                  <dd>{formatDate(detail.creation_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email verified</dt>
                  <dd className="pt-0.5">
                    <VerifiedBadge verified={detail.email_verified} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Mobile verified</dt>
                  <dd className="pt-0.5">
                    <VerifiedBadge verified={detail.mobile_verified} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Platform</dt>
                  <dd className="flex items-center gap-1.5">
                    <PlatformIcon platform={detail.platform} />
                    {formatPlatformLabel(detail.platform)}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Charging stats</h3>
            {detailLoading ? (
              <div className="flex justify-center py-4 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : !detail ? null : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Sessions", value: String(detail.sessions_count) },
                  { label: "Total Energy (kWh)", value: formatEnergy(detail.total_kwh) },
                  { label: "Total Amount (JOD)", value: formatAmount(detail.total_amount) },
                  { label: "Total Paid (JOD)", value: formatAmount(detail.total_paid) },
                  { label: "First session", value: formatDate(detail.first_session) },
                  { label: "Last session", value: formatDate(detail.last_session) },
                ].map((stat) => (
                  <Card key={stat.label} className="border-border shadow-none">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        {stat.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm font-semibold">
                      {stat.value}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Recent sessions</h3>
            {sessionsLoading ? (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : sessionsError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-6 text-center space-y-3">
                <p className="text-sm text-destructive">Failed to load sessions. {sessionsError}</p>
                <Button variant="outline" size="sm" onClick={() => void loadSessions()}>
                  Retry
                </Button>
              </div>
            ) : sessionsTotal === 0 ? (
              <EmptyState title="No sessions" description="No charging sessions recorded." />
            ) : (
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Start</TableHead>
                      <TableHead>Charger</TableHead>
                      <TableHead>Connector</TableHead>
                      <TableHead>kWh</TableHead>
                      <TableHead>Amount (JOD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.session_id || `${session.start_date}-${session.charger}`}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(session.start_date)}
                        </TableCell>
                        <TableCell>{displayValue(session.charger)}</TableCell>
                        <TableCell>{displayValue(session.connector)}</TableCell>
                        <TableCell>{formatEnergy(session.total_kwh)}</TableCell>
                        <TableCell>{formatAmount(session.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {sessionsTotal > SESSIONS_PAGE_SIZE ? (
                  <div className="flex items-center justify-between gap-4 border-t border-border px-3 py-2">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {sessionsRangeText}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setSessionsPage((p) => Math.max(1, p - 1))}
                        disabled={safeSessionsPage <= 1 || sessionsLoading}
                        aria-label="Previous page"
                        title="Previous page"
                      >
                        <PrevIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setSessionsPage((p) => Math.min(sessionsPageCount, p + 1))
                        }
                        disabled={safeSessionsPage >= sessionsPageCount || sessionsLoading}
                        aria-label="Next page"
                        title="Next page"
                      >
                        <NextIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Recent payments</h3>
            {paymentsLoading ? (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : paymentsError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-6 text-center space-y-3">
                <p className="text-sm text-destructive">Failed to load payments. {paymentsError}</p>
                <Button variant="outline" size="sm" onClick={() => void loadPayments()}>
                  Retry
                </Button>
              </div>
            ) : paymentsTotal === 0 ? (
              <EmptyState title="No payments" description="No payment records found." />
            ) : (
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Amount (JOD)</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment, idx) => (
                      <TableRow
                        key={`${payment.reference ?? ""}-${payment.created_at ?? ""}-${idx}`}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDate(payment.created_at)}
                        </TableCell>
                        <TableCell>{displayValue(payment.type)}</TableCell>
                        <TableCell>{displayValue(payment.source)}</TableCell>
                        <TableCell>{formatAmount(payment.amount)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {displayValue(payment.reference)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {paymentsTotal > PAYMENTS_PAGE_SIZE ? (
                  <div className="flex items-center justify-between gap-4 border-t border-border px-3 py-2">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {paymentsRangeText}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                        disabled={safePaymentsPage <= 1 || paymentsLoading}
                        aria-label="Previous page"
                        title="Previous page"
                      >
                        <PrevIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setPaymentsPage((p) => Math.min(paymentsPageCount, p + 1))}
                        disabled={safePaymentsPage >= paymentsPageCount || paymentsLoading}
                        aria-label="Next page"
                        title="Next page"
                      >
                        <NextIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
