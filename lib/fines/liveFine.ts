// Parent: REQ-0029, REQ-0031 — pure live-fine calculations (no I/O)

import type { FineRateHistoryRow, FineStatus, LiveFineInput } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetweenUtc(later: Date, earlier: Date): number {
  return Math.floor((utcDay(later).getTime() - utcDay(earlier).getTime()) / DAY_MS);
}

export function parseStoredFine(
  storedFine: number | string | null | undefined,
): number {
  if (typeof storedFine === "number") {
    return Number.isFinite(storedFine) ? storedFine : 0;
  }
  const n = parseFloat(String(storedFine ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

/** Active loan overdue days (0 if not overdue / no due date). */
export function getOverdueDaysForBorrow(
  status: string,
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
): number {
  if (status !== "BORROWED") return 0;
  const due = toDate(dueDate);
  if (!due) return 0;
  const days = daysBetweenUtc(now, due);
  return days > 0 ? days : 0;
}

/**
 * Calendar days until due (0 = due today, 1–2 = due soon window).
 * Negative when the due calendar day is already past.
 */
export function getCalendarDaysUntilDue(
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  const due = toDate(dueDate);
  if (!due) return null;
  return daysBetweenUtc(due, now);
}

/** End of the due UTC calendar day — Remaining counts down to this instant. */
export function getDueCalendarEndUtc(
  dueDate: Date | string | null | undefined,
): number | null {
  const due = toDate(dueDate);
  if (!due) return null;
  const day = utcDay(due);
  return Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    23,
    59,
    59,
    999,
  );
}

/** Persistable fine snapshot when a loan is returned. */
export function resolveReturnFine(input: {
  fineStatus?: string | null;
  storedFine: number | string | null;
  dueDate: Date | string | null;
  dailyRate: number;
  rateHistory?: readonly FineRateHistoryRow[];
  now?: Date;
}): { fineAmount: string; fineStatus: FineStatus } {
  const status = input.fineStatus ?? "NONE";
  if (status === "WAIVED") {
    return { fineAmount: "0.00", fineStatus: "WAIVED" };
  }
  if (status === "PAID") {
    return {
      fineAmount: formatFineAmount(parseStoredFine(input.storedFine)),
      fineStatus: "PAID",
    };
  }
  const live = computeLiveFineForRow({
    status: "BORROWED",
    dueDate: input.dueDate,
    storedFine: input.storedFine,
    dailyRate: input.dailyRate,
    fineStatus: status,
    rateHistory: input.rateHistory,
    now: input.now,
  });
  return {
    fineAmount: formatFineAmount(live),
    fineStatus: live > 0 ? "STAMPED" : "NONE",
  };
}

function isClosedBorrow(status: string): boolean {
  return status === "RETURNED" || status === "CANCELLED";
}

function sortedRateHistory(
  history: readonly FineRateHistoryRow[] | undefined,
): FineRateHistoryRow[] {
  if (!history?.length) return [];
  return [...history].sort(
    (a, b) =>
      toDate(a.effectiveFrom)!.getTime() - toDate(b.effectiveFrom)!.getTime(),
  );
}

/** Pro-rata accrual: each segment uses the rate effective from effectiveFrom. */
export function computeProRataFine(
  dueDate: Date,
  now: Date,
  rateHistory: readonly FineRateHistoryRow[],
  fallbackRate: number,
): number {
  const segments = sortedRateHistory(rateHistory);
  const dueDay = utcDay(dueDate);
  const nowDay = utcDay(now);
  if (nowDay.getTime() <= dueDay.getTime()) return 0;

  let total = 0;
  const cursor = new Date(dueDay);
  cursor.setUTCDate(cursor.getUTCDate() + 1);

  while (cursor.getTime() <= nowDay.getTime()) {
    const day = utcDay(cursor);
    let rate = Math.max(0, fallbackRate);
    for (const row of segments) {
      const effective = toDate(row.effectiveFrom);
      if (effective && utcDay(effective).getTime() <= day.getTime()) {
        rate = Math.max(0, row.rate);
      }
    }
    total += rate;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return round(total);
}

/**
 * Display fine for one borrow row.
 * Closed loans: frozen stored amount (never recalc on rate change).
 * Open overdue: live accrual (pro-rata when rateHistory provided).
 */
export function computeLiveFineForRow(input: LiveFineInput): number {
  const now = input.now ?? new Date();
  const stored = parseStoredFine(input.storedFine);
  const fineStatus = input.fineStatus ?? undefined;

  if (fineStatus === "WAIVED" || fineStatus === "PAID") {
    return fineStatus === "WAIVED" ? 0 : stored;
  }

  if (isClosedBorrow(input.status)) {
    return stored;
  }

  const overdueDays = getOverdueDaysForBorrow(input.status, input.dueDate, now);
  if (overdueDays <= 0) {
    return stored;
  }

  const due = toDate(input.dueDate);
  if (!due) return stored;

  const history = sortedRateHistory(input.rateHistory);
  if (history.length > 0) {
    return computeProRataFine(due, now, history, input.dailyRate);
  }

  return round(Math.max(0, input.dailyRate) * overdueDays);
}

/**
 * Live outstanding = sum(max(0, daysOverdue) × dailyRate).
 * Same product as the overdue table; does not write borrow_records.fine_amount.
 */
export function computeLiveOutstandingFine(
  overdueDayCounts: readonly number[],
  dailyRate: number,
): number {
  const rate = Math.max(0, dailyRate);
  const total = overdueDayCounts.reduce((sum, days) => {
    const n = Number(days);
    if (!Number.isFinite(n)) return sum;
    return sum + Math.max(0, n) * rate;
  }, 0);
  return round(total);
}

/** Format a fine amount for display (2 decimal places). */
export function formatFineAmount(amount: number | string | null | undefined): string {
  const n =
    typeof amount === "number"
      ? amount
      : parseFloat(String(amount ?? "0"));
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}
