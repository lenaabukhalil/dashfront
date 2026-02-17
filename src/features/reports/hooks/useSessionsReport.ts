import { useCallback, useMemo, useState } from "react";
import {
  fetchActiveSessions,
  fetchLocalSessions,
  fetchSessionsReport,
} from "@/services/api";
import type { ActiveSession, LocalSession } from "@/services/api";

export interface SessionReportRow {
  sessionId: string;
  charger: string;
  location: string;
  startTime: string;
  endTime: string;
  duration: string;
  energy: string;
  cost: string;
  status: string;
}

function getDefaultDateRange() {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 6); // last 7 days
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

const defaultRange = getDefaultDateRange();

export interface SessionsReportFilters {
  dateFrom: string;
  dateTo: string;
  locationId: string;
  chargerId: string;
  status: string;
}

const initialFilters: SessionsReportFilters = {
  dateFrom: defaultRange.from,
  dateTo: defaultRange.to,
  locationId: "",
  chargerId: "",
  status: "",
};

function parseDateSafe(value: unknown): number | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function getEndTime(row: Record<string, unknown>): string {
  const keys = [
    "end_date",
    "charging_end_date",
    "End Date/Time",
    "End Time",
    "end_date_time",
    "endDate",
    "endTime",
    "end_time",
    "Ended At",
    "stop_time",
    "stopped_at",
  ];
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "—";
}

function getDuration(row: Record<string, unknown>): string {
  const keys = [
    "duration",
    "charge_duration",
    "Duration",
    "duration_minutes",
  ];
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "—";
}

function getStartTime(row: Record<string, unknown>): string {
  const keys = ["start_date", "Start Date/Time", "Start Time", "startTime", "start_date_time"];
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "—";
}

function toSessionRow(
  row: ActiveSession | LocalSession,
  sessionId: string
): SessionReportRow {
  const r = row as Record<string, unknown>;
  const energy = r["Energy (KWH)"] ?? r.kwh;
  const amount = r["Amount (JOD)"] ?? r.amount;
  return {
    sessionId,
    charger: String(r.Charger ?? r.chargerID ?? "—"),
    location: String(r.Location ?? r.location_id ?? "—"),
    startTime: getStartTime(r),
    endTime: getEndTime(r),
    duration: getDuration(r),
    energy:
      energy != null && Number.isFinite(Number(energy))
        ? String(Number(energy))
        : "—",
    cost:
      amount != null && Number.isFinite(Number(amount))
        ? String(Number(amount))
        : "—",
    status: String(r.stop_reason ?? "—"),
  };
}

function mergeSessions(
  active: ActiveSession[],
  local: LocalSession[]
): SessionReportRow[] {
  const out: SessionReportRow[] = [];
  active.forEach((row, i) => {
    const r = row as Record<string, unknown>;
    const id = r["Session ID"] ?? r.session_id ?? `active-${i + 1}`;
    out.push(toSessionRow(row, String(id)));
  });
  local.forEach((row, i) => {
    const r = row as Record<string, unknown>;
    const id = r.session_id ?? r["Session ID"] ?? `local-${i + 1}`;
    out.push(toSessionRow(row, String(id)));
  });
  return out;
}

export function useSessionsReport() {
  const [filters, setFilters] = useState<SessionsReportFilters>({
    ...initialFilters,
  });
  const [rows, setRows] = useState<SessionReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const from = (filters.dateFrom || "").trim();
      const to = (filters.dateTo || "").trim();
      if (from && to) {
        const data = await fetchSessionsReport(from, to);
        const mapped = data.map((r, i) => {
          const id = (r["Session ID"] ?? r.session_id ?? i + 1);
          return toSessionRow(r as ActiveSession, String(id));
        });
        setRows(mapped);
      } else {
        const [active, local] = await Promise.all([
          fetchActiveSessions(),
          fetchLocalSessions(),
        ]);
        setRows(mergeSessions(active, local));
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.location && r.location !== "—") set.add(r.location);
    });
    return Array.from(set)
      .sort()
      .map((value) => ({ value, label: value }));
  }, [rows]);

  const chargerOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.charger && r.charger !== "—") set.add(r.charger);
    });
    return Array.from(set)
      .sort()
      .map((value) => ({ value, label: value }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filters.locationId) {
      list = list.filter((r) => r.location === filters.locationId);
    }
    if (filters.chargerId) {
      list = list.filter((r) => r.charger === filters.chargerId);
    }
    if (filters.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters.dateFrom || filters.dateTo) {
      list = list.filter((r) => {
        const t = parseDateSafe(r.startTime);
        if (t == null) return true;
        if (filters.dateFrom) {
          const from = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
          if (t < from) return false;
        }
        if (filters.dateTo) {
          const to = new Date(filters.dateTo).setHours(23, 59, 59, 999);
          if (t > to) return false;
        }
        return true;
      });
    }
    return list;
  }, [rows, filters]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.status && r.status !== "—") set.add(r.status);
    });
    return Array.from(set)
      .sort()
      .map((value) => ({ value, label: value }));
  }, [rows]);

  return {
    filters,
    setFilters,
    rows: filteredRows,
    allRows: rows,
    loading,
    error,
    handleGenerate,
    locationOptions,
    chargerOptions,
    statusOptions,
  };
}
