/**
 * Pure borrow KPI derivation for My Profile.
 * Computes from the client/SSR borrow list — no extra network calls.
 */

import {
  computeLiveFineForRow,
  getCalendarDaysUntilDue,
  getOverdueDaysForBorrow,
  parseStoredFine,
} from "@/lib/fines/liveFine";
import type { FineRateHistoryRow } from "@/lib/fines/types";

export interface BorrowStatsInput {
  id: string;
  bookId: string;
  status: "PENDING" | "BORROWED" | "RETURNED" | string;
  dueDate: Date | string | null;
  returnDate?: Date | string | null;
  borrowDate?: Date | string | null;
  createdAt?: Date | string | null;
  fineAmount: number | string;
  fineStatus?: string | null;
  renewalCount?: number | null;
  bookTitle?: string | null;
}

export interface BorrowStats {
  totalBorrows: number;
  pending: number;
  active: number;
  returned: number;
  cancelled: number;
  overdueNow: number;
  dueSoon: number;
  withFines: number;
  totalFines: number;
  totalRenewals: number;
  avgRenewalsPerLoan: number;
  uniqueBooks: number;
  onTimeReturns: number;
  lateReturns: number;
  returnedThisMonth: number;
  pendingOldestWaitDays: number;
  totalReviews: number;
  dueSoonTitles: string[];
  dueSoonLeadRemaining: number | null;
}

const DAY_MS = 1000 * 60 * 60 * 24;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseFine(fineAmount: number | string): number {
  return parseStoredFine(fineAmount);
}

function daysBetweenUtc(later: Date, earlier: Date): number {
  return Math.floor((utcDay(later).getTime() - utcDay(earlier).getTime()) / DAY_MS);
}

/** Active loan overdue days (0 if not overdue / no due date). */
export function getOverdueDays(
  status: string,
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
): number {
  return getOverdueDaysForBorrow(status, dueDate, now);
}

/** Fine for one record: live overdue accrual or stored fine. */
export function getRecordFine(
  record: Pick<
    BorrowStatsInput,
    "status" | "dueDate" | "fineAmount" | "fineStatus"
  >,
  dailyRate: number,
  now: Date = new Date(),
  rateHistory?: readonly FineRateHistoryRow[],
): number {
  return computeLiveFineForRow({
    status: record.status,
    dueDate: record.dueDate,
    storedFine: record.fineAmount,
    dailyRate,
    fineStatus: record.fineStatus,
    rateHistory,
    now,
  });
}

export function computeBorrowStats(
  records: BorrowStatsInput[],
  totalReviews: number,
  dailyRate: number,
  now: Date = new Date(),
  rateHistory?: readonly FineRateHistoryRow[],
): BorrowStats {
  let pending = 0;
  let active = 0;
  let returned = 0;
  let cancelled = 0;
  let overdueNow = 0;
  let dueSoon = 0;
  let withFines = 0;
  let totalFines = 0;
  let totalRenewals = 0;
  let onTimeReturns = 0;
  let lateReturns = 0;
  let returnedThisMonth = 0;
  let pendingOldestWaitDays = 0;
  const dueSoonTitles: string[] = [];
  let dueSoonLeadRemaining: number | null = null;

  const uniqueBookIds = new Set<string>();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();

  for (const r of records) {
    uniqueBookIds.add(r.bookId);
    totalRenewals += r.renewalCount ?? 0;

    const fine = getRecordFine(r, dailyRate, now, rateHistory);
    totalFines += fine;
    if (fine > 0) withFines += 1;

    if (r.status === "PENDING") {
      pending += 1;
      const started = toDate(r.borrowDate) ?? toDate(r.createdAt);
      if (started) {
        const wait = Math.max(0, daysBetweenUtc(now, started));
        if (wait > pendingOldestWaitDays) pendingOldestWaitDays = wait;
      }
      continue;
    }

    if (r.status === "BORROWED") {
      active += 1;
      const overdueDays = getOverdueDays(r.status, r.dueDate, now);
      if (overdueDays > 0) {
        overdueNow += 1;
      } else {
        const remaining = getCalendarDaysUntilDue(r.dueDate, now);
        // Due today or within next 2 calendar days
        if (remaining != null && remaining >= 0 && remaining <= 2) {
          dueSoon += 1;
          if (dueSoonLeadRemaining === null) dueSoonLeadRemaining = remaining;
          const title = r.bookTitle?.trim();
          if (title) dueSoonTitles.push(title);
        }
      }
      continue;
    }

    if (r.status === "RETURNED") {
      returned += 1;
      const due = toDate(r.dueDate);
      const ret = toDate(r.returnDate);
      if (due && ret) {
        if (utcDay(ret).getTime() > utcDay(due).getTime()) lateReturns += 1;
        else onTimeReturns += 1;
      } else if (parseFine(r.fineAmount) > 0) {
        lateReturns += 1;
      } else {
        onTimeReturns += 1;
      }
      const stamp = ret ?? toDate(r.createdAt);
      if (
        stamp &&
        stamp.getUTCFullYear() === year &&
        stamp.getUTCMonth() === month
      ) {
        returnedThisMonth += 1;
      }
      continue;
    }

    if (r.status === "CANCELLED") {
      cancelled += 1;
    }
  }

  const totalBorrows = records.length;
  const avgRenewalsPerLoan =
    totalBorrows > 0
      ? Math.round((totalRenewals / totalBorrows) * 10) / 10
      : 0;

  return {
    totalBorrows,
    pending,
    active,
    returned,
    cancelled,
    overdueNow,
    dueSoon,
    withFines,
    totalFines: Math.round(totalFines * 100) / 100,
    totalRenewals,
    avgRenewalsPerLoan,
    uniqueBooks: uniqueBookIds.size,
    onTimeReturns,
    lateReturns,
    returnedThisMonth,
    pendingOldestWaitDays,
    totalReviews,
    dueSoonTitles,
    dueSoonLeadRemaining,
  };
}

export function formatDueSoonHint(
  titles: readonly string[],
  leadRemainingDays: number | null = null,
): string {
  const cleaned = titles.map((title) => title.trim()).filter(Boolean);
  if (cleaned.length === 0) return "Due today or tomorrow";
  const prefix = leadRemainingDays === 0 ? "Due today" : "Due soon";
  if (cleaned.length === 1) return `${prefix}: ${cleaned[0]}`;
  const shown = cleaned.slice(0, 2).join(" · ");
  const extra = cleaned.length > 2 ? ` +${cleaned.length - 2} more` : "";
  return `${prefix}: ${shown}${extra}`;
}
