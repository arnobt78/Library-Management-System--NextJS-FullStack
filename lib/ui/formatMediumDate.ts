/**
 * Locale-stable medium date for admin/user list table cells.
 * Parent: CR-0003 / REQ-0034 cosmetic DRY — replaces inlined
 * `toLocaleDateString("en-US", { dateStyle: "medium" })` (+ `as never` casts).
 */
export function formatMediumDate(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

/**
 * Medium date + short time for Created/Updated densify stacks
 * (e.g. "Aug 5, 2026, 3:40 PM").
 */
export function formatMediumDateTime(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
