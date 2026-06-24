import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AppSelect } from "@/components/shared/AppSelect";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ChargedTodayRow,
  ChargingNowRow,
  formatKwh,
  formatRangeText,
  formatStatInt,
  LIVE_ACTIVITY_PAGE_SIZE,
  StatTile,
} from "@/features/users/live-activity/liveActivityShared";
import { useLiveActivityPoll } from "@/features/users/live-activity/useLiveActivityPoll";
import { ChargingUserDetail } from "@/features/users/components/ChargingUserDetail";
import { ChargingRfidDetail } from "@/features/users/components/ChargingRfidDetail";
export type LiveActivityPageMode = "charging" | "today";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

interface LiveActivityPageContentProps {
  mode: LiveActivityPageMode;
  pollIntervalMs: number;
}

export function LiveActivityPageContent({ mode, pollIntervalMs }: LiveActivityPageContentProps) {
  const navigate = useNavigate();
  const { t, dir } = useLanguage();
  const { data, initialLoading, refreshError } = useLiveActivityPoll(
    pollIntervalMs,
    t("users.liveActivity.loadError"),
    t("users.liveActivity.refreshError"),
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIVE_ACTIVITY_PAGE_SIZE);
  const [expandedSessionKey, setExpandedSessionKey] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRfidUserId, setSelectedRfidUserId] = useState<number | null>(null);
  const [rfidDetailOpen, setRfidDetailOpen] = useState(false);

  const handleOpenDetail = (userId: number) => {
    setSelectedUserId(userId);
    setDetailOpen(true);
  };

  const handleOpenRfidDetail = (id: number) => {
    setSelectedRfidUserId(id);
    setRfidDetailOpen(true);
  };

  const handleOpenLinkedUser = (userId: number) => {
    setRfidDetailOpen(false);
    setSelectedUserId(userId);
    setDetailOpen(true);
  };

  const kwhSuffix = t("users.liveActivity.kwh");
  const rfidNameTemplate = t("users.liveActivity.rfidName");
  const chargingDetailLabels = useMemo(
    () => ({
      phone: t("users.liveActivity.phone"),
      rfid: t("users.liveActivity.rfidLabel"),
      startedAt: t("users.liveActivity.startedAt"),
      energy: t("users.liveActivity.energy"),
      amount: t("users.liveActivity.amount"),
      location: t("users.liveActivity.locationLabel"),
      charger: t("users.liveActivity.chargerLabel"),
      connector: t("users.liveActivity.connectorLabel"),
    }),
    [t],
  );

  const chargingNow = data?.charging_now ?? [];
  const chargedToday = data?.charged_today ?? [];
  const activeItems = mode === "charging" ? chargingNow : chargedToday;
  const total = activeItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setExpandedSessionKey(null);
  }, [page, mode]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  const visibleCharging = useMemo(() => chargingNow.slice(start, end), [chargingNow, start, end]);
  const visibleCharged = useMemo(() => chargedToday.slice(start, end), [chargedToday, start, end]);

  const rangeText = formatRangeText(
    t("users.liveActivity.rangeOf"),
    total === 0 ? 0 : start + 1,
    end,
    total,
  );

  const pageTitle =
    mode === "charging" ? t("users.liveActivity.chargingNow") : t("users.liveActivity.chargedToday");

  const emptyMessage =
    mode === "charging" ? t("users.liveActivity.noCharging") : t("users.liveActivity.noToday");

  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  const handleTabChange = (value: string) => {
    if (value === "charging") navigate("/users/charging-now");
    if (value === "today") navigate("/users/charged-today");
  };

  return (
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
      </div>

      {initialLoading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : (
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
      )}

      {refreshError ? (
        <p className="text-xs text-muted-foreground" role="status">
          {refreshError}
        </p>
      ) : null}

      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={handleTabChange}
        className="justify-start"
        size="sm"
        variant="outline"
      >
        <ToggleGroupItem value="charging" aria-label={t("users.liveActivity.chargingNow")}>
          {t("users.liveActivity.chargingNow")} · {chargingNow.length}
        </ToggleGroupItem>
        <ToggleGroupItem value="today" aria-label={t("users.liveActivity.chargedToday")}>
          {t("users.liveActivity.chargedToday")} · {chargedToday.length}
        </ToggleGroupItem>
      </ToggleGroup>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{pageTitle}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {initialLoading && !data ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : total === 0 ? (
            <div className="flex min-h-[15rem] flex-col items-center justify-center gap-2 px-4 py-8">
              {mode === "charging" ? (
                <Zap className="size-8 text-muted-foreground/60" aria-hidden />
              ) : (
                <Users className="size-8 text-muted-foreground/60" aria-hidden />
              )}
              <p className="text-sm text-muted-foreground text-center">{emptyMessage}</p>
            </div>
          ) : mode === "charging" ? (
            <ul className="divide-y divide-border">
              {visibleCharging.map((session, index) => {
                const rowKey = String(session.session_id ?? `charging-${start + index}`);
                return (
                  <ChargingNowRow
                    key={rowKey}
                    session={session}
                    kwhSuffix={kwhSuffix}
                    startedAgoLabel={t("users.liveActivity.startedAgo")}
                    rfidNameTemplate={rfidNameTemplate}
                    expanded={expandedSessionKey === rowKey}
                    onToggle={() =>
                      setExpandedSessionKey((prev) => (prev === rowKey ? null : rowKey))
                    }
                    detailLabels={chargingDetailLabels}
                    onOpenDetail={handleOpenDetail}
                    onOpenRfidDetail={handleOpenRfidDetail}
                  />
                );
              })}
            </ul>
          ) : (
            <ul className="divide-y divide-border">
              {visibleCharged.map((user) => {
                const rowKey = `today-${user.user_id}`;
                return (
                  <ChargedTodayRow
                    key={rowKey}
                    user={user}
                    kwhSuffix={kwhSuffix}
                    sessionsCountLabel={t("users.liveActivity.sessionsCount")}
                    lastAgoLabel={t("users.liveActivity.lastAgo")}
                    expanded={expandedSessionKey === rowKey}
                    onToggle={() =>
                      setExpandedSessionKey((prev) => (prev === rowKey ? null : rowKey))
                    }
                    detailLabels={chargingDetailLabels}
                    sessionLabel={t("users.liveActivity.session")}
                    onOpenDetail={handleOpenDetail}
                  />
                );
              })}
            </ul>
          )}

          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-foreground whitespace-nowrap">Items per page</span>
                <div className="w-[72px] min-w-[72px]">
                  <AppSelect
                    options={PAGE_SIZE_OPTIONS}
                    value={String(pageSize)}
                    onChange={(v) => {
                      setPageSize(Number(v) || LIVE_ACTIVITY_PAGE_SIZE);
                      setPage(1);
                    }}
                    placeholder="10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                  {rangeText}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={safePage <= 1}
                    onClick={() => setPage(1)}
                    aria-label="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <PrevIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    <NextIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(totalPages)}
                    aria-label="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ChargingUserDetail
        userId={selectedUserId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <ChargingRfidDetail
        rfidUserId={selectedRfidUserId}
        open={rfidDetailOpen}
        onOpenChange={setRfidDetailOpen}
        isCurrentlyCharging={mode === "charging"}
        onOpenLinkedUser={handleOpenLinkedUser}
      />
    </div>
  );
}
