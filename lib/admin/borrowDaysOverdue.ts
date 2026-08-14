/**
 * Calendar days overdue for an open BORROWED loan (client KPI hint).
 * Matches returnBorrowRecord day math in borrowLifecycle (UTC date slice).
 * Parent: borrow detail UI polish
 */

export function borrowDaysOverdue(
  status: string,
  dueDate: string | Date | null | undefined,
  now: Date = new Date(),
): number {
  if (status !== "BORROWED" || !dueDate) return 0;
  const due =
    typeof dueDate === "string"
      ? new Date(dueDate.length <= 10 ? `${dueDate}T00:00:00.000Z` : dueDate)
      : dueDate;
  if (Number.isNaN(due.getTime())) return 0;
  const today = new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");
  const dueDay = new Date(due.toISOString().slice(0, 10) + "T00:00:00.000Z");
  return Math.max(
    0,
    Math.floor((today.getTime() - dueDay.getTime()) / (1000 * 60 * 60 * 24)),
  );
}
