import { useEffect, useMemo, useState } from "react";
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
import {
  fetchChargingUserDetail,
  fetchChargingUserPayments,
  fetchChargingUserSessions,
  type ChargingUserDetail as ChargingUserDetailData,
  type ChargingUserPlatform,
  type ChargingUserPayment,
  type ChargingUserSession,
} from "@/services/api";
import { Apple, ChevronLeft, ChevronRight, Loader2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const SESSIONS_PAGE_SIZE = 10;

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

export function ChargingUserDetail({ userId, open, onOpenChange }: ChargingUserDetailProps) {
  const { dir } = useLanguage();
  const [detail, setDetail] = useState<ChargingUserDetailData | null>(null);
  const [sessions, setSessions] = useState<ChargingUserSession[]>([]);
  const [payments, setPayments] = useState<ChargingUserPayment[]>([]);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const sessionsTotal = sessions.length;
  const sessionsPageCount = Math.max(1, Math.ceil(sessionsTotal / SESSIONS_PAGE_SIZE));
  const safeSessionsPage = Math.min(Math.max(1, sessionsPage), sessionsPageCount);
  const sessionsStart = (safeSessionsPage - 1) * SESSIONS_PAGE_SIZE;
  const sessionsEnd = Math.min(sessionsStart + SESSIONS_PAGE_SIZE, sessionsTotal);
  const visibleSessions = useMemo(
    () => sessions.slice(sessionsStart, sessionsEnd),
    [sessions, sessionsStart, sessionsEnd],
  );
  const sessionsRangeText = `${sessionsStart + 1}-${sessionsEnd} of ${sessionsTotal}`;

  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  useEffect(() => {
    setSessionsPage(1);
  }, [userId]);

  useEffect(() => {
    setSessionsPage((p) => Math.min(Math.max(1, p), sessionsPageCount));
  }, [sessionsPageCount]);

  useEffect(() => {
    if (!open || userId == null || !Number.isFinite(userId)) {
      setDetail(null);
      setSessions([]);
      setPayments([]);
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

    const loadSessions = async () => {
      setSessionsLoading(true);
      try {
        const data = await fetchChargingUserSessions(userId);
        if (!cancelled) setSessions(data);
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    };

    const loadPayments = async () => {
      setPaymentsLoading(true);
      try {
        const data = await fetchChargingUserPayments(userId);
        if (!cancelled) setPayments(data);
      } finally {
        if (!cancelled) setPaymentsLoading(false);
      }
    };

    void loadDetail();
    void loadSessions();
    void loadPayments();

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

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
            ) : sessions.length === 0 ? (
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
                    {visibleSessions.map((session) => (
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
                        disabled={safeSessionsPage <= 1}
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
                        disabled={safeSessionsPage >= sessionsPageCount}
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
            ) : payments.length === 0 ? (
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
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
