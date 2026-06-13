/** Whole-number counts (sessions, connectors, etc.). */
export function fmtMetricInteger(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return String(Math.round(n));
}

/** Rates, amounts, energy — always 2 decimal places. */
export function fmtMetricDecimal(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(2);
}

/** Comparison card metrics: integers plain, decimals fixed to 2 places. */
export function formatResultMetric(value: unknown, opts?: { integer?: boolean }): string {
  if (opts?.integer) return fmtMetricInteger(value);
  return fmtMetricDecimal(value);
}
