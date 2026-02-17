function formatCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return String(Number.isFinite(value) ? value : "");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString();
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T | string; header: string }[]
): string {
  const header = columns.map((c) => formatCell(c.header)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => formatCell(row[c.key as keyof T])).join(",")
  );
  return [header, ...body].join("\r\n");
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
