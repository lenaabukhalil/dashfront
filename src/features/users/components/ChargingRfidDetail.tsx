import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AccessScopeCell,
  accessScopeTooltipText,
} from "@/features/users/rfid/rfidAccessScope";
import { toUserIdNumber, userInitials } from "@/features/users/live-activity/liveActivityShared";
import { formatDateTime } from "@/lib/formatDateTime";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { cn } from "@/lib/utils";
import { getRfidUser, updateRfidUser, type RfidUserRecord } from "@/services/api";
import { usePermission } from "@/hooks/usePermission";
import { ArrowUpRight, Loader2, UserCircle, X, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function displayValue(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "-";
  return String(value).trim();
}

function formatAmount(value: number | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "-";
}

function formatEnergy(value: number | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "-";
}

function statusBadgeClass(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "active") {
    return "border-transparent bg-emerald-600/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
  }
  if (s === "suspended") {
    return "border-transparent bg-amber-600/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200";
  }
  if (s === "disabled" || s === "blocked") {
    return "border-transparent bg-red-600/15 text-red-800 dark:bg-red-500/20 dark:text-red-300";
  }
  return "";
}

function resolveDisplayStatus(record: RfidUserRecord): string {
  if (record.status === "blocked") return "blocked";
  if (record.enabled === 0) return "disabled";
  return record.status;
}

function resolveLinkedUserId(record: RfidUserRecord): number | null {
  return toUserIdNumber(record.linked_user_id ?? record.user_id);
}

function resolveCardholderIdentity(record: RfidUserRecord): {
  name: string;
  mobile: string;
  email: string;
  linkedUserId: number | null;
} {
  const linkedUserId = resolveLinkedUserId(record);
  if (linkedUserId != null) {
    const linkedName = [record.linked_first_name, record.linked_last_name]
      .map((v) => (v != null ? String(v).trim() : ""))
      .filter(Boolean)
      .join(" ")
      .trim();
    return {
      linkedUserId,
      name: linkedName || resolveCardholderNameFromRfid(record),
      mobile: record.linked_mobile != null ? String(record.linked_mobile).trim() : "",
      email: record.linked_email != null ? String(record.linked_email).trim() : "",
    };
  }
  return {
    linkedUserId: null,
    name: resolveCardholderNameFromRfid(record),
    mobile: record.mobile != null ? String(record.mobile).trim() : "",
    email: record.email != null ? String(record.email).trim() : "",
  };
}

function resolveCardholderNameFromRfid(record: RfidUserRecord): string {
  const fromParts = [record.first_name, record.last_name]
    .map((v) => (v != null ? String(v).trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromParts) return fromParts;
  const legacyName = record.name != null ? String(record.name).trim() : "";
  if (legacyName) return legacyName;
  const uid = record.rfid_uid != null ? String(record.rfid_uid).trim().toUpperCase() : "";
  return uid ? `RFID ${uid}` : "RFID User";
}

function resolveOrganizationName(record: RfidUserRecord): string {
  const name = record.organization_name != null ? String(record.organization_name).trim() : "";
  if (name) return name;
  return Number.isFinite(record.organization_id) ? `#${record.organization_id}` : "-";
}

function fieldDiffersFromLinked(
  cardValue: string | null | undefined,
  linkedValue: string | null | undefined,
): boolean {
  const card = cardValue != null ? String(cardValue).trim() : "";
  const linked = linkedValue != null ? String(linkedValue).trim() : "";
  if (!card) return false;
  if (!linked) return true;
  return card !== linked;
}

interface ChargingRfidDetailProps {
  rfidUserId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCurrentlyCharging?: boolean;
  onOpenLinkedUser?: (userId: number) => void;
}

export function ChargingRfidDetail({
  rfidUserId,
  open,
  onOpenChange,
  isCurrentlyCharging = false,
  onOpenLinkedUser,
}: ChargingRfidDetailProps) {
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canWrite } = usePermission(role);
  const canEditRfid = canWrite("rfid.edit");

  const [detail, setDetail] = useState<RfidUserRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const loadDetail = async () => {
    if (rfidUserId == null || !Number.isFinite(rfidUserId)) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const data = await getRfidUser(rfidUserId);
      setDetail(data);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!open || rfidUserId == null || !Number.isFinite(rfidUserId)) {
      setDetail(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setDetailLoading(true);
      try {
        const data = await getRfidUser(rfidUserId);
        if (!cancelled) setDetail(data);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [open, rfidUserId]);

  const identity = detail != null ? resolveCardholderIdentity(detail) : null;
  const displayName = identity?.name ?? "RFID User";
  const displayStatus = detail != null ? resolveDisplayStatus(detail) : "";
  const linkedUserId = identity?.linkedUserId ?? null;
  const allowedLocationsNames =
    detail?.allowed_locations_names != null
      ? String(detail.allowed_locations_names).trim()
      : "";

  const handleUnlink = async () => {
    if (rfidUserId == null || !canEditRfid) return;
    setUnlinking(true);
    try {
      const res = await updateRfidUser(rfidUserId, { user_id: null });
      if (!res.success) {
        toast({ title: "Error", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Unlinked", description: "ION account link removed." });
      setUnlinkOpen(false);
      await loadDetail();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to unlink",
        variant: "destructive",
      });
    } finally {
      setUnlinking(false);
    }
  };

  const showMobileOverride =
    detail != null &&
    linkedUserId != null &&
    fieldDiffersFromLinked(detail.mobile, detail.linked_mobile);
  const showEmailOverride =
    detail != null &&
    linkedUserId != null &&
    fieldDiffersFromLinked(detail.email, detail.linked_email);
  const hideMobile =
    linkedUserId != null &&
    !showMobileOverride &&
    (detail?.mobile == null || String(detail.mobile).trim() === "");
  const hideEmail =
    linkedUserId != null &&
    !showEmailOverride &&
    (detail?.email == null || String(detail.email).trim() === "");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto" dir={dir}>
          <SheetHeader className="text-left space-y-2 pb-4">
            {detailLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading RFID user…</span>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <SheetTitle>{displayName}</SheetTitle>
                  {displayStatus ? (
                    <Badge
                      variant="outline"
                      className={cn("font-medium capitalize", statusBadgeClass(displayStatus))}
                    >
                      {displayStatus}
                    </Badge>
                  ) : null}
                </div>
                <SheetDescription>
                  {detail?.rfid_uid
                    ? displayValue(detail.rfid_uid.toUpperCase())
                    : "Registered RFID cardholder profile"}
                </SheetDescription>
              </>
            )}
          </SheetHeader>

          {isCurrentlyCharging && !detailLoading ? (
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
            {!detailLoading && detail && linkedUserId != null ? (
              <section className="rounded-lg border border-border bg-muted/25 p-4">
                <h3 className="text-sm font-semibold mb-3">Linked ION account</h3>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div
                        className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
                        aria-hidden
                      >
                        {userInitials({
                          first_name: detail.linked_first_name ?? undefined,
                          last_name: detail.linked_last_name ?? undefined,
                          mobile: identity?.mobile,
                        })}
                      </div>
                      <UserCircle
                        className="absolute -bottom-0.5 -end-0.5 size-4 rounded-full bg-background text-primary"
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {displayValue(identity?.name !== "—" ? identity?.name : undefined)}
                      </p>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {displayValue(identity?.mobile) !== "-"
                          ? displayValue(identity?.mobile)
                          : "—"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {displayValue(identity?.email) !== "-"
                          ? displayValue(identity?.email)
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onOpenLinkedUser ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => onOpenLinkedUser(linkedUserId)}
                      >
                        View ION account
                        <ArrowUpRight className="size-3.5 ms-1" aria-hidden />
                      </Button>
                    ) : null}
                    {canEditRfid ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => setUnlinkOpen(true)}
                      >
                        <X className="size-3.5 me-1" aria-hidden />
                        Unlink
                      </Button>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="text-sm font-semibold mb-3">RFID Profile</h3>
              {detailLoading ? (
                <div className="flex justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : !detail ? (
                <EmptyState title="Not found" description="RFID user details could not be loaded." />
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">RFID UID</dt>
                    <dd className="font-mono uppercase">{displayValue(detail.rfid_uid)}</dd>
                  </div>
                  {!hideMobile ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Mobile
                        {showMobileOverride ? (
                          <span className="ms-1 font-normal text-muted-foreground">(card override)</span>
                        ) : null}
                      </dt>
                      <dd>
                        {showMobileOverride
                          ? displayValue(detail.mobile)
                          : displayValue(identity?.mobile || detail.mobile)}
                      </dd>
                    </div>
                  ) : null}
                  {!hideEmail ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Email
                        {showEmailOverride ? (
                          <span className="ms-1 font-normal text-muted-foreground">(card override)</span>
                        ) : null}
                      </dt>
                      <dd>
                        {showEmailOverride
                          ? displayValue(detail.email)
                          : displayValue(identity?.email || detail.email)}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs text-muted-foreground">Organization</dt>
                    <dd>{resolveOrganizationName(detail)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Card type</dt>
                    <dd>{displayValue(detail.card_type)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Access scope</dt>
                    <dd className="pt-0.5">
                      <AccessScopeCell u={detail} />
                    </dd>
                  </div>
                  {allowedLocationsNames ? (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">Allowed locations</dt>
                      <dd className="text-muted-foreground whitespace-pre-wrap">
                        {allowedLocationsNames || accessScopeTooltipText(detail)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-3">Stats</h3>
              {detailLoading ? (
                <div className="flex justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : !detail ? null : (
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Sessions", value: String(detail.sessions_count) },
                    { label: "Total Energy (kWh)", value: formatEnergy(detail.total_kwh) },
                    { label: "Total Amount (JOD)", value: formatAmount(detail.total_amount) },
                    { label: "Last session", value: formatDateTime(detail.last_session_at) },
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

            {detail?.notes != null && String(detail.notes).trim() !== "" ? (
              <section>
                <h3 className="text-sm font-semibold mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detail.notes}</p>
              </section>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink ION account?</AlertDialogTitle>
            <AlertDialogDescription>
              This card will no longer be associated with the linked ION app user. Cardholder details
              on the RFID record will remain unless you edit them separately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={unlinking}
              onClick={() => void handleUnlink()}
            >
              {unlinking ? "Unlinking…" : "Unlink"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
