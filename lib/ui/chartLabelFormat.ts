/**
 * Compact Recharts LabelList formatters — Insights chart value labels (no clip with margins).
 */

/** Integer count; hide zero when `hideZero` to reduce noise on sparse series. */
export function formatChartCount(
  value: unknown,
  hideZero = false,
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (hideZero && n === 0) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** USD compact for fine forecast bars. */
export function formatChartUsd(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "$0";
  return n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`;
}

/** Pie slice percent label. */
export function formatChartPercent(percent: unknown): string {
  const n = Number(percent);
  if (!Number.isFinite(n)) return "";
  return `${Math.round(n)}%`;
}
