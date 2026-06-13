import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { toggleVariants } from "@/components/ui/toggle";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  formatKwh,
  formatStatInt,
  LIVE_ACTIVITY_STRIP_POLL_MS,
  StatTile,
} from "@/features/users/live-activity/liveActivityShared";
import { useLiveActivityPoll } from "@/features/users/live-activity/useLiveActivityPoll";
import { cn } from "@/lib/utils";

function LiveActivityStripSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-card p-4 space-y-4"
      aria-busy="true"
      aria-label="Loading live activity"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
    </div>
  );
}

export function LiveActivityStrip() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, initialLoading, refreshError } = useLiveActivityPoll(
    LIVE_ACTIVITY_STRIP_POLL_MS,
    t("users.liveActivity.loadError"),
    t("users.liveActivity.refreshError"),
  );

  const chargingNow = data?.charging_now ?? [];
  const chargedToday = data?.charged_today ?? [];

  if (initialLoading && !data) {
    return <LiveActivityStripSkeleton />;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {refreshError ? (
        <p className="text-xs text-muted-foreground" role="status">
          {refreshError}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={t("users.liveActivity.activeNow")}
          value={formatStatInt(data?.active_now)}
          liveDot
        />
        <StatTile
          label={t("users.liveActivity.sessionsToday")}
          value={formatStatInt(data?.sessions_today)}
        />
        <StatTile label={t("users.liveActivity.kwhToday")} value={formatKwh(data?.kwh_today)} />
        <StatTile
          label={t("users.liveActivity.usersToday")}
          value={formatStatInt(data?.users_today)}
        />
      </div>

      <div className="flex items-center justify-start gap-1">
        <button
          type="button"
          className={cn(toggleVariants({ variant: "outline", size: "sm" }))}
          onClick={() => navigate("/users/charging-now")}
        >
          {t("users.liveActivity.chargingNow")} · {chargingNow.length}
        </button>
        <button
          type="button"
          className={cn(toggleVariants({ variant: "outline", size: "sm" }))}
          onClick={() => navigate("/users/charged-today")}
        >
          {t("users.liveActivity.chargedToday")} · {chargedToday.length}
        </button>
      </div>
    </div>
  );
}
