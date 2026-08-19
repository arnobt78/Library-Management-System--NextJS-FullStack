/**
 * Serialize borrow due/return/approved clocks for API + densify.
 * Date-only strings become UTC noon so calendar overdue stays stable.
 */

export function serializeBorrowTimestamp(
  value: string | Date | null | undefined,
): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return `${trimmed}T12:00:00.000Z`;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : trimmed;
  }
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

/** Profile RQ map — keep approve/cancel/renew clocks as Date, not dropped fields. */
export function toStableBorrowDate(
  value: string | Date | null | undefined,
): Date | null {
  if (!value) return null;
  const timestamp =
    typeof value === "string" ? new Date(value).getTime() : value.getTime();
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}
