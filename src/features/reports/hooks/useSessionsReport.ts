import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchReportChargersByLocationIds,
  fetchReportConnectorsByChargerIds,
  fetchReportLocations,
  fetchOrganizationsList,
  fetchLocationsByOrgRaw,
  fetchChargersByLocationId,
  fetchConnectorsByChargerId,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { buildCSV, downloadCSV } from "@/components/reports/exportUtils";

function pad2(n: number): string {
  return String(Math.max(0, Math.min(99, n))).padStart(2, "0");
}

function todayYmd(): string {
  const t = new Date();
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
}

export function getDefaultSessionsReportFilters() {
  const t = new Date();
  return {
    fromDate: todayYmd(),
    fromHour: "00",
    fromMinute: "00",
    toDate: todayYmd(),
    toHour: pad2(t.getHours()),
    toMinute: pad2(t.getMinutes()),
    locationIds: [] as string[],
    chargerIds: [] as string[],
    connectorIds: [] as string[],
    energyMin: "",
    energyMax: "",
    dateOrder: "desc" as "asc" | "desc",
  };
}

export type SessionsReportFiltersState = ReturnType<typeof getDefaultSessionsReportFilters>;

export type SessionsReportTableRow = {
  startDateTime: string;
  sessionId: string;
  location: string;
  charger: string;
  connector: string;
  energyKwh: number;
  amountJod: number;
  mobile: string;
};
export type UserTypeFilter = "all" | "ion" | "rfid";

function getStartDateTime(row: Record<string, unknown>): string {
  const v =
    row.StartDateTime ??
    row["Start Date/Time"] ??
    row.start_date ??
    row.start_date_time ??
    row.issue_date ??
    row.startTime ??
    row.start_time ??
    "";
  return String(v || "—");
}
function getSessionId(row: Record<string, unknown>): string {
  const v = row.SessionID ?? row["Session ID"] ?? row.session_id ?? row.sessionId ?? row.sessionid ?? "—";
  return String(v || "—");
}
function getLocation(row: Record<string, unknown>): string {
  const v = row.Location ?? row.location_name ?? row.location ?? "—";
  return String(v || "—");
}
function getCharger(row: Record<string, unknown>): string {
  const v = row.Charger ?? row.charger_id ?? row.chargerID ?? row.chargerId ?? "—";
  return String(v || "—");
}
function getConnector(row: Record<string, unknown>): string {
  const v = row.Connector ?? row.connector_type ?? row.connectorType ?? row.connector_id ?? "—";
  return String(v || "—");
}
function getEnergy(row: Record<string, unknown>): number {
  const v = row.EnergyKWH ?? row["Energy (KWH)"] ?? row.total_kwh ?? row.totalKwh ?? row.kwh ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function getAmount(row: Record<string, unknown>): number {
  const v = row.AmountJOD ?? row["Amount (JOD)"] ?? row.total_amount ?? row.totalAmount ?? row.amount ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function getMobile(row: Record<string, unknown>): string {
  const v = row.Mobile ?? row.issued_to ?? row.mobile ?? "—";
  return String(v || "—");
}
function mapRow(r: Record<string, unknown>): SessionsReportTableRow {
  return {
    startDateTime: getStartDateTime(r),
    sessionId: getSessionId(r),
    location: getLocation(r),
    charger: getCharger(r),
    connector: getConnector(r),
    energyKwh: getEnergy(r),
    amountJod: getAmount(r),
    mobile: getMobile(r),
  };
}

function toMillis(date: string, hh: string, mm: string): number {
  const [y, mo, d] = date.split("-").map((x) => Number(x));
  const h = Number(hh);
  const m = Number(mm);
  if (![y, mo, d, h, m].every((n) => Number.isFinite(n))) return NaN;
  return new Date(y, mo - 1, d, h, m, 0, 0).getTime();
}

export function useSessionsReport() {
  const [filters, setFilters] = useState<SessionsReportFiltersState>(() => getDefaultSessionsReportFilters());
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([]);
  const [chargerOptions, setChargerOptions] = useState<{ value: string; label: string }[]>([]);
  const [connectorOptions, setConnectorOptions] = useState<{ value: string; label: string }[]>([]);
  const [organizations, setOrganizations] = useState<{ id: number; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [locations, setLocations] = useState<{ location_id: number; name: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [chargers, setChargers] = useState<{ charger_id: number; name: string }[]>([]);
  const [selectedChargerId, setSelectedChargerId] = useState("");
  const [connectors, setConnectors] = useState<{ connector_id: number; connector_type: string }[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState("");

  const [rows, setRows] = useState<SessionsReportTableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [perPage, setPerPage] = useState(20);

  useEffect(() => {
    let c = false;
    fetchReportLocations()
      .then((opts) => {
        if (!c) setLocationOptions(opts);
      })
      .catch(() => {});
    return () => {
      c = true;
    };
  }, []);

  const locKey = filters.locationIds.join(",");
  useEffect(() => {
    let c = false;
    fetchReportChargersByLocationIds(filters.locationIds)
      .then((opts) => {
        if (!c) setChargerOptions(opts);
      })
      .catch(() => {
        if (!c) setChargerOptions([]);
      });
    return () => {
      c = true;
    };
  }, [locKey]);

  const chKey = filters.chargerIds.join(",");
  useEffect(() => {
    let c = false;
    fetchReportConnectorsByChargerIds(filters.chargerIds)
      .then((opts) => {
        if (!c) setConnectorOptions(opts);
      })
      .catch(() => {
        if (!c) setConnectorOptions([]);
      });
    return () => {
      c = true;
    };
  }, [chKey]);

  useEffect(() => {
    fetchOrganizationsList()
      .then(setOrganizations)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setSelectedLocationId("");
    setSelectedChargerId("");
    setSelectedConnectorId("");
    setChargers([]);
    setConnectors([]);
    fetchLocationsByOrgRaw(selectedOrgId || undefined)
      .then(setLocations)
      .catch(console.error);
  }, [selectedOrgId]);

  useEffect(() => {
    setSelectedChargerId("");
    setSelectedConnectorId("");
    setConnectors([]);
    if (!selectedLocationId) {
      setChargers([]);
      return;
    }
    fetchChargersByLocationId(selectedLocationId)
      .then(setChargers)
      .catch(console.error);
  }, [selectedLocationId]);

  useEffect(() => {
    setSelectedConnectorId("");
    if (!selectedChargerId) {
      setConnectors([]);
      return;
    }
    fetchConnectorsByChargerId(selectedChargerId)
      .then(setConnectors)
      .catch(console.error);
  }, [selectedChargerId]);

  const validate = useCallback((): string | null => {
    const { fromDate, fromHour, fromMinute, toDate, toHour, toMinute, energyMin, energyMax, dateOrder } = filters;
    if (!fromDate || !toDate) return "From and To dates are required.";
    if (fromHour === "" || fromMinute === "" || toHour === "" || toMinute === "")
      return "All time fields are required.";
    const fh = Number(fromHour);
    const fm = Number(fromMinute);
    const th = Number(toHour);
    const tm = Number(toMinute);
    if (!Number.isInteger(fh) || fh < 0 || fh > 23) return "From hour must be 00–23.";
    if (!Number.isInteger(fm) || fm < 0 || fm > 59) return "From minute must be 00–59.";
    if (!Number.isInteger(th) || th < 0 || th > 23) return "To hour must be 00–23.";
    if (!Number.isInteger(tm) || tm < 0 || tm > 59) return "To minute must be 00–59.";
    if (dateOrder !== "asc" && dateOrder !== "desc") return "Invalid sort order.";
    const t0 = toMillis(fromDate, String(fh), String(fm));
    const t1 = toMillis(toDate, String(th), String(tm));
    if (!Number.isFinite(t0) || !Number.isFinite(t1)) return "Invalid date or time.";
    if (t0 > t1) return "From date/time must be before or equal to To date/time.";
    const emin = energyMin.trim();
    const emax = energyMax.trim();
    if (emin !== "") {
      const n = Number(emin);
      if (!Number.isFinite(n)) return "Energy Min must be a valid number.";
    }
    if (emax !== "") {
      const n = Number(emax);
      if (!Number.isFinite(n)) return "Energy Max must be a valid number.";
    }
    if (emin !== "" && emax !== "") {
      const a = Number(emin);
      const b = Number(emax);
      if (a > b) return "Energy Min cannot be greater than Energy Max.";
    }
    return null;
  }, [filters]);

  const loadSessions = useCallback(async (userType: UserTypeFilter = "all") => {
    const errMsg = validate();
    if (errMsg) {
      toast({ title: "Validation", description: errMsg, variant: "destructive" });
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const from = `${filters.fromDate} ${filters.fromHour}:${filters.fromMinute}:00`;
      const to = `${filters.toDate} ${filters.toHour}:${filters.toMinute}:59`;
      const params = new URLSearchParams({
        from: from.trim(),
        to: to.trim(),
        dateOrder: filters.dateOrder,
        userType,
      });
      if (selectedOrgId) params.set("organizationId", selectedOrgId);
      if (selectedLocationId) params.set("locationId", selectedLocationId);
      if (selectedChargerId) params.set("chargerIds", selectedChargerId);
      if (selectedConnectorId) params.set("connectorIds", selectedConnectorId);
      if (filters.energyMin) params.set("energyMin", filters.energyMin);
      if (filters.energyMax) params.set("energyMax", filters.energyMax);

      const res = await fetch(`/api/v4/dashboard/sessions-report-v2?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch sessions report v2");
      const json = (await res.json()) as { data?: Record<string, unknown>[] };
      const data = json.data ?? [];
      setRows((data || []).map((r) => mapRow(r as Record<string, unknown>)));
      setHasLoaded(true);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      setRows([]);
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [filters, validate, selectedOrgId, selectedLocationId, selectedChargerId, selectedConnectorId]);

  const clearFilters = useCallback(() => {
    setFilters(getDefaultSessionsReportFilters());
    setRows([]);
    setError(null);
    setHasLoaded(false);
    setPerPage(20);
    setSelectedOrgId("");
    setSelectedLocationId("");
    setSelectedChargerId("");
    setSelectedConnectorId("");
  }, []);

  const exportCsv = useCallback(async () => {
    try {
      const columns = [
        { key: "startDateTime", header: "Start Date/Time" },
        { key: "sessionId", header: "Session ID" },
        { key: "location", header: "Location" },
        { key: "charger", header: "Charger" },
        { key: "connector", header: "Connector" },
        { key: "energyKwh", header: "Energy (KWH)" },
        { key: "amountJod", header: "Amount (JOD)" },
        { key: "mobile", header: "Mobile" },
      ] as const;
      const csv = buildCSV(rows, columns as any);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `sessions-report-${date}.csv`);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  }, [rows]);

  const setDateOrder = useCallback((order: "asc" | "desc") => {
    setFilters((f) => ({ ...f, dateOrder: order }));
  }, []);

  const onPerPageChange = useCallback((n: number) => {
    setPerPage(n);
  }, []);

  return {
    filters,
    setFilters,
    locationOptions,
    chargerOptions,
    connectorOptions,
    organizations,
    selectedOrgId,
    setSelectedOrgId,
    locations,
    selectedLocationId,
    setSelectedLocationId,
    chargers,
    selectedChargerId,
    setSelectedChargerId,
    connectors,
    selectedConnectorId,
    setSelectedConnectorId,
    rows,
    loading,
    error,
    hasLoaded,
    loadSessions,
    clearFilters,
    exportCsv,
    perPage,
    onPerPageChange,
    setDateOrder,
    validate,
  };
}
