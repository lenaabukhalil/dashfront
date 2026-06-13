import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ChevronDown, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ChargedTodaySession,
  ChargedTodayUser,
  LiveActivitySession,
} from "@/services/api";

export const LIVE_ACTIVITY_PAGE_POLL_MS = 5_000;
export const LIVE_ACTIVITY_STRIP_POLL_MS = 30_000;
export const LIVE_ACTIVITY_PAGE_SIZE = 10;

export function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export function parseLocalDateTime(value?: string): Date | null {
  if (!value?.trim()) return null;
  const s = value.trim();
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const d = parseISO(normalized);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function personDisplayName(parts: {
  first_name?: string;
  last_name?: string;
  mobile?: string;
}): string {
  const name = [parts.first_name, parts.last_name].filter(Boolean).join(" ").trim();
  return name || parts.mobile?.trim() || "—";
}

export function userInitials(parts: {
  first_name?: string;
  last_name?: string;
  mobile?: string;
}): string {
  const first = parts.first_name?.trim();
  const last = parts.last_name?.trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  const mobile = parts.mobile?.trim();
  if (mobile) return mobile.slice(0, 2).toUpperCase();
  return "?";
}

export function formatStatInt(value: number | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n)) : "—";
}

export function formatKwh(value: number | undefined, decimals = 1): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(decimals) : "—";
}

export function formatAgo(value: string | undefined): string {
  const d = parseLocalDateTime(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "—";
}

type DisplayableValue = string | number | null | undefined;

type PersonNameParts = {
  first_name?: string;
  last_name?: string;
  mobile?: DisplayableValue;
  rfid?: string;
};

export function resolveChargingSessionName(parts: PersonNameParts, rfidNameTemplate: string): string {
  const name = [parts.first_name, parts.last_name]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
  if (name) return name;
  const mobile = displayOrDash(parts.mobile);
  if (mobile !== "—") return mobile;
  const rfid = displayOrDash(parts.rfid);
  if (rfid !== "—") return rfidNameTemplate.replace("{rfid}", rfid);
  return "—";
}

export function isRfidOnlySession(parts: PersonNameParts): boolean {
  const name = [parts.first_name, parts.last_name]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
  if (name) return false;
  if (displayOrDash(parts.mobile) !== "—") return false;
  return displayOrDash(parts.rfid) !== "—";
}

export function displayOrDash(value: DisplayableValue): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? "—" : trimmed;
  }
  return "—";
}

export function fmt2(value: DisplayableValue): string {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(2)} JOD` : "—";
}

export function formatEnergyDetail(kwh: DisplayableValue, unit: string): string {
  const n = Number(kwh);
  return Number.isFinite(n) ? `${n.toFixed(1)} ${unit}` : "—";
}

export type SessionDetailLabels = {
  startedAt: string;
  energy: string;
  amount: string;
  location: string;
  charger: string;
  connector: string;
};

type SessionDetailSource = Pick<
  LiveActivitySession,
  "start_date" | "location" | "charger" | "connector" | "total_kwh" | "total_amount"
>;

export function formatStartedAt(value: DisplayableValue): string {
  if (value === null || value === undefined) return "—";
  const raw =
    typeof value === "string"
      ? value
      : typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : "";
  const d = parseLocalDateTime(raw || undefined);
  return d ? format(d, "dd MMM, HH:mm") : "—";
}

export function formatRangeText(template: string, start: number, end: number, total: number): string {
  return template.replace("{start}", String(start)).replace("{end}", String(end)).replace("{total}", String(total));
}

export function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground font-medium tabular-nums truncate">{value}</p>
    </div>
  );
}

export function SessionDetailGrid({
  session,
  kwhSuffix,
  labels,
}: {
  session: SessionDetailSource | ChargedTodaySession;
  kwhSuffix: string;
  labels: SessionDetailLabels;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
      <DetailField label={labels.startedAt} value={formatStartedAt(session.start_date)} />
      <DetailField label={labels.energy} value={formatEnergyDetail(session.total_kwh, kwhSuffix)} />
      <DetailField label={labels.amount} value={fmt2(session.total_amount)} />
      <DetailField label={labels.location} value={displayOrDash(session.location)} />
      <DetailField label={labels.charger} value={displayOrDash(session.charger)} />
      <DetailField label={labels.connector} value={displayOrDash(session.connector)} />
    </div>
  );
}

export function UserAvatar({
  initials,
  live,
  showRfidIcon,
}: {
  initials: string;
  live?: boolean;
  showRfidIcon?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <div
        className="size-8 rounded-full grid place-items-center bg-primary/10 text-primary text-xs font-semibold"
        aria-hidden
      >
        {showRfidIcon ? <CreditCard className="size-4" /> : initials}
      </div>
      {live ? (
        <span
          className="absolute bottom-0 end-0 size-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse ring-2 ring-card"
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function KwhTrailing({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="text-end shrink-0">
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

export function ChargingNowRow({
  session,
  kwhSuffix,
  startedAgoLabel,
  rfidNameTemplate,
  expanded,
  onToggle,
  detailLabels,
}: {
  session: LiveActivitySession;
  kwhSuffix: string;
  startedAgoLabel: string;
  rfidNameTemplate: string;
  expanded: boolean;
  onToggle: () => void;
  detailLabels: SessionDetailLabels & { phone: string; rfid: string };
}) {
  const ago = formatAgo(session.start_date);
  const startedText = startedAgoLabel.replace("{ago}", ago);
  const location = session.location?.trim() || "—";
  const charger = session.charger?.trim() || "—";
  const meta = [location, charger, startedText].join(" · ");
  const rfidOnly = isRfidOnlySession(session);
  const displayName = resolveChargingSessionName(session, rfidNameTemplate);
  const rfidValue = displayOrDash(session.rfid);

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-3 py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors text-start"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <UserAvatar initials={userInitials(session)} live showRfidIcon={rfidOnly} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{meta}</p>
        </div>
        <KwhTrailing value={formatKwh(session.total_kwh)} unit={kwhSuffix} />
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="border-t border-border bg-muted/30 px-4 py-4 mx-4 mb-2 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <DetailField label={detailLabels.phone} value={displayOrDash(session.mobile)} />
            {rfidValue !== "—" ? <DetailField label={detailLabels.rfid} value={rfidValue} /> : null}
          </div>
          <SessionDetailGrid session={session} kwhSuffix={kwhSuffix} labels={detailLabels} />
        </div>
      ) : null}
    </li>
  );
}

export function ChargedTodayRow({
  user,
  kwhSuffix,
  sessionsCountLabel,
  lastAgoLabel,
  expanded,
  onToggle,
  detailLabels,
  sessionLabel,
}: {
  user: ChargedTodayUser;
  kwhSuffix: string;
  sessionsCountLabel: string;
  lastAgoLabel: string;
  expanded: boolean;
  onToggle: () => void;
  detailLabels: SessionDetailLabels & { phone: string };
  sessionLabel: string;
}) {
  const ago = formatAgo(user.last_start);
  const sessionsText = sessionsCountLabel.replace("{n}", formatStatInt(user.sessions_today));
  const lastText = lastAgoLabel.replace("{ago}", ago);
  const sessions = user.sessions?.length ? user.sessions : null;

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-3 py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors text-start"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <UserAvatar initials={userInitials(user)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{personDisplayName(user)}</p>
          <p className="text-xs text-muted-foreground truncate">
            {sessionsText} · {lastText}
          </p>
        </div>
        <div className="text-end shrink-0">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatKwh(user.kwh_today)}{" "}
            <span className="text-xs font-normal text-muted-foreground">{kwhSuffix}</span>
          </p>
          <p className="text-xs text-muted-foreground">{lastText}</p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="border-t border-border bg-muted/30 px-4 py-4 mx-4 mb-2 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <DetailField label={detailLabels.phone} value={displayOrDash(user.mobile)} />
          </div>
          {sessions ? (
            <div className="max-h-64 overflow-y-auto divide-y divide-border">
              {sessions.map((session, index) => {
                const startedAt = formatStartedAt(session.start_date);
                return (
                  <div
                    key={session.session_id ?? `session-${index}`}
                    className="space-y-2 py-3 first:pt-0 last:pb-0"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {sessionLabel} · {startedAt}
                    </p>
                    <SessionDetailGrid session={session} kwhSuffix={kwhSuffix} labels={detailLabels} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <DetailField label={lastAgoLabel.replace("{ago}", "").trim()} value={lastText} />
              <DetailField
                label={sessionsCountLabel.replace("{n}", "").trim()}
                value={formatStatInt(user.sessions_today)}
              />
              <DetailField
                label={detailLabels.energy}
                value={formatEnergyDetail(user.kwh_today, kwhSuffix)}
              />
              <DetailField label={detailLabels.amount} value={fmt2(user.amount_today)} />
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function StatTile({
  label,
  value,
  liveDot,
}: {
  label: string;
  value: string;
  liveDot?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground truncate">{label}</p>
      <div className="mt-1 flex items-center gap-1.5 min-w-0">
        {liveDot ? (
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"
            aria-hidden
          />
        ) : null}
        <p className="text-foreground font-semibold tabular-nums truncate">{value}</p>
      </div>
    </div>
  );
}
