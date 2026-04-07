/** Consistent display for API datetimes (e.g. "2026-01-04 08:00:00"). */
export function formatDateTime(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const s = String(value).trim();
  if (!s) return "—";
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(normalized);
  if (!Number.isFinite(d.getTime())) return s;
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  });
}
