import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/shared/AppSelect";
import { PieChart, Loader2, Calendar } from "lucide-react";
import { fetchChargerOrganizations, fetchLocationsByOrg, fetchSessionsReport } from "@/services/api";
import type { SelectOption } from "@/types";
import { EmptyState } from "@/components/shared/EmptyState";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";

function getAmount(row: Record<string, unknown>): number {
  const v = row["Amount (JOD)"] ?? row.amount ?? row.Amount ?? row.total_amount;
  return Number(v) || 0;
}
function getKwh(row: Record<string, unknown>): number {
  const v = row["Energy (KWH)"] ?? row.energy ?? row.kwh ?? row.total_kwh ?? row.totalKwh;
  return Number(v) || 0;
}
function getLocation(row: Record<string, unknown>): string {
  const v = row.Location ?? row.location_name ?? row.location ?? "";
  return String(v || "—").trim();
}

type RevenueSharingRow = {
  location: string;
  sessions: number;
  total: number;
  totalKwh?: number;
  partner: number;
  platform: number;
};

const REVENUE_COLUMNS: ReportColumn<RevenueSharingRow>[] = [
  { key: "location", header: "Location" },
  { key: "sessions", header: "Sessions" },
  {
    key: "total",
    header: "Total (JOD)",
    render: (row) => row.total.toFixed(2),
  },
  {
    key: "partner",
    header: "ION Revenue",
    render: (row) => row.partner.toFixed(2),
  },
  {
    key: "platform",
    header: "Partner Revenue",
    render: (row) => row.platform.toFixed(2),
  },
];

const TOTAL_KWH_COLUMN: ReportColumn<RevenueSharingRow> = {
  key: "totalKwh",
  header: "Total KWH",
  render: (row) => (row.totalKwh != null ? row.totalKwh.toFixed(2) : "—"),
};

export function RevenueSharingTab() {
  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shareMode, setShareMode] = useState<"percent" | "fixed" | "fixed_total" | "fixed_kwh">("percent");
  const [partnerPercent, setPartnerPercent] = useState(30);
  const [fixedFee, setFixedFee] = useState(0); // JOD per session (fixed fees / session)
  const [fixedFeeTotal, setFixedFeeTotal] = useState(0); // JOD total for all sessions (fixed fee on all sessions)
  const [fixedFeePerKwh, setFixedFeePerKwh] = useState(0); // JOD per KWH (fixed fee for total KWH)
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RevenueSharingRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchChargerOrganizations()
      .then((opts) => { if (!cancelled) setOrgOptions(opts); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedOrg) {
      setLocationOptions([]);
      setSelectedLocation("");
      return;
    }
    let cancelled = false;
    fetchLocationsByOrg(selectedOrg)
      .then((opts) => { if (!cancelled) setLocationOptions(opts); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedOrg]);

  const runReport = async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    setRows([]);
    try {
      const sessions = await fetchSessionsReport(fromDate, toDate);
      const byLocation = new Map<string, { total: number; totalKwh: number; sessionIds: Set<string> }>();
      for (const row of sessions as Record<string, unknown>[]) {
        const loc = getLocation(row);
        const amount = getAmount(row);
        const kwh = getKwh(row);
        const sessionIdRaw =
          row["Session ID"] ?? row.session_id ?? row.sessionId ?? row.sessionid;
        const sessionId = String(sessionIdRaw ?? "").trim();

        const cur =
          byLocation.get(loc) ?? { total: 0, totalKwh: 0, sessionIds: new Set<string>() };
        cur.total += amount;
        cur.totalKwh += kwh;
        if (sessionId && amount > 0) {
          cur.sessionIds.add(sessionId);
        }
        byLocation.set(loc, cur);
      }
      const locationFilter = selectedLocation
        ? locationOptions.find((o) => o.value === selectedLocation)?.label ?? ""
        : "";
      const partnerP = Math.min(100, Math.max(0, partnerPercent)) / 100;
      const feePerSession = Math.max(0, fixedFee || 0);
      const feeTotalAll = Math.max(0, fixedFeeTotal || 0);
      const feePerKwh = Math.max(0, fixedFeePerKwh || 0);

      const locationEntries: { location: string; total: number; totalKwh: number; sessionsCount: number }[] = [];
      byLocation.forEach(({ total, totalKwh, sessionIds }, location) => {
        if (locationFilter && location !== locationFilter) return;
        const roundedTotal = Math.round(total * 100) / 100;
        const roundedKwh = Math.round(totalKwh * 100) / 100;
        locationEntries.push({
          location,
          total: roundedTotal,
          totalKwh: roundedKwh,
          sessionsCount: sessionIds.size,
        });
      });
      const grandTotal = locationEntries.reduce((s, e) => s + e.total, 0);

      const list: RevenueSharingRow[] = [];
      for (const { location, total: roundedTotal, totalKwh, sessionsCount } of locationEntries) {
        let partnerRaw: number;
        if (shareMode === "fixed") {
          const nominalPartner = sessionsCount * feePerSession;
          partnerRaw = Math.min(roundedTotal, nominalPartner);
        } else if (shareMode === "fixed_total") {
          const totalPartnerCap = Math.min(grandTotal, feeTotalAll);
          const locationShare = grandTotal > 0 ? roundedTotal / grandTotal : 0;
          partnerRaw = totalPartnerCap * locationShare;
        } else if (shareMode === "fixed_kwh") {
          const nominalPartner = totalKwh * feePerKwh;
          partnerRaw = Math.min(roundedTotal, nominalPartner);
        } else {
          partnerRaw = roundedTotal * partnerP;
        }

        let platformRaw = roundedTotal - partnerRaw;
        if (platformRaw < 0) platformRaw = 0;

        const roundedPartner = Math.round(partnerRaw * 100) / 100;
        const roundedPlatform = Math.round(platformRaw * 100) / 100;

        list.push({
          location,
          sessions: sessionsCount,
          total: roundedTotal,
          totalKwh,
          partner: roundedPartner,
          platform: roundedPlatform,
        });
      }
      list.sort((a, b) => b.total - a.total);
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = rows.reduce((s, r) => s + r.total, 0);
  const totalPartner = rows.reduce((s, r) => s + r.partner, 0);
  const totalPlatform = rows.reduce((s, r) => s + r.platform, 0);
  const totalSessions = rows.reduce((s, r) => s + (r.sessions || 0), 0);

  const safeOrgOptions = orgOptions.filter((o) => o != null && o.value != null && String(o.value).trim() !== "");
  const safeLocationOptions = locationOptions.filter((o) => o != null && o.value != null && String(o.value).trim() !== "");

  const tableColumns = useMemo(() => {
    if (shareMode !== "fixed_kwh") return REVENUE_COLUMNS;
    const idx = REVENUE_COLUMNS.findIndex((c) => c.key === "total");
    if (idx < 0) return [...REVENUE_COLUMNS, TOTAL_KWH_COLUMN];
    return [...REVENUE_COLUMNS.slice(0, idx + 1), TOTAL_KWH_COLUMN, ...REVENUE_COLUMNS.slice(idx + 1)];
  }, [shareMode]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Revenue Sharing
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Analyze total revenue per location and split it between ION and partner using a percentage, a fixed fee per session, a fixed fee on all sessions, or a fixed fee per total KWH.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border bg-muted/20 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" /> From
                  </Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <AppSelect
                    options={[
                      { value: "__ALL__", label: "All" },
                      ...safeOrgOptions.filter((opt) => String(opt.value).trim()),
                    ]}
                    value={selectedOrg || "__ALL__"}
                    onChange={(v) => setSelectedOrg(v === "__ALL__" ? "" : v)}
                    placeholder="All"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <AppSelect
                    options={[
                      { value: "__ALL__", label: "All" },
                      ...safeLocationOptions.filter((opt) => String(opt.value).trim()),
                    ]}
                    value={selectedLocation || "__ALL__"}
                    onChange={(v) => setSelectedLocation(v === "__ALL__" ? "" : v)}
                    placeholder="All"
                    isDisabled={!selectedOrg}
                  />
                </div>
              </div>

              <div className="w-full lg:w-72 space-y-3">
                <div className="space-y-2">
                  <Label>Share mode</Label>
                  <AppSelect
                    options={[
                      { value: "percent", label: "ION %" },
                      { value: "fixed", label: "Fixed fees / session" },
                      { value: "fixed_total", label: "Fixed fee on all sessions" },
                      { value: "fixed_kwh", label: "Fixed fee per KWH (total KWH)" },
                    ]}
                    value={shareMode}
                    onChange={(v) =>
                      setShareMode(
                        v === "fixed"
                          ? "fixed"
                          : v === "fixed_total"
                            ? "fixed_total"
                            : v === "fixed_kwh"
                              ? "fixed_kwh"
                              : "percent"
                      )
                    }
                    placeholder="Share mode"
                  />
                </div>

                {shareMode === "percent" ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      ION %
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={partnerPercent}
                      onChange={(e) =>
                        setPartnerPercent(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                ) : shareMode === "fixed_total" ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Fixed fee total for all sessions (JOD)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={fixedFeeTotal}
                      onChange={(e) =>
                        setFixedFeeTotal(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                ) : shareMode === "fixed_kwh" ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Fixed fee per KWH (JOD)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.001"
                      value={fixedFeePerKwh}
                      onChange={(e) =>
                        setFixedFeePerKwh(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Fixed fee per session (JOD)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={fixedFee}
                      onChange={(e) =>
                        setFixedFee(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                )}

                <div className="pt-1">
                  <Button
                    onClick={runReport}
                    disabled={loading}
                    className="w-full lg:w-auto lg:self-end"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {loading ? "Loading…" : "Generate"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
            </div>
          )}

          {!loading && rows.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Sessions: {totalSessions}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold">{totalRevenue.toFixed(2)} JOD</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/20">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      {shareMode === "percent"
                        ? `ION share (${partnerPercent}%)`
                        : shareMode === "fixed_total"
                          ? `ION share (fixed ${fixedFeeTotal || 0} JOD total)`
                          : shareMode === "fixed_kwh"
                            ? `ION share (${fixedFeePerKwh || 0} JOD / KWH)`
                            : `ION share (fixed ${fixedFee || 0} JOD / session)`}
                    </p>
                    <p className="text-xl font-bold">
                      {totalPartner.toFixed(2)} JOD
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      {shareMode === "percent"
                        ? `Partner share (${100 - partnerPercent}%)`
                        : "Partner share"}
                    </p>
                    <p className="text-xl font-bold">
                      {totalPlatform.toFixed(2)} JOD
                    </p>
                  </CardContent>
                </Card>
              </div>

              <ReportTable<RevenueSharingRow>
                columns={tableColumns}
                data={rows}
                pagination={true}
                emptyMessage="No locations in this period."
              />
            </>
          )}

          {!loading && rows.length === 0 && fromDate && toDate && (
            <EmptyState
              title="Generate report"
              description="Choose date range, share mode (ION %, fixed per session, fixed total, or fixed per KWH), then click Generate to see revenue sharing by location."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
