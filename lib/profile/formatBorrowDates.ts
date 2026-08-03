/**
 * Borrow record date formatters for My Profile status lines.
 * - formatBorrowDate: SQL date / calendar day (UTC) — dueDate, returnDate
 * - formatBorrowDateTime: timestamptz — borrowDate (requested), updatedAt (approved proxy)
 */

export function formatBorrowDate(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null;
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime())) return null;
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatBorrowDateTime(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null;
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime())) return null;
  return dateObj.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
