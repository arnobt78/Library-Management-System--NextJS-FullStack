/**
 * Client-only My Profile tab list filters (period + status).
 * Pure helpers — no React. Applied after status-split memos on already-fetched data.
 */
import {
  AlarmClock,
  CheckCircle2,
  List,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type { FilterSelectOption } from "@/components/ui/filter-select";
import type { FilterSurface } from "@/lib/ui/filterOptionStyles";
import type { ListPeriod } from "@/lib/ui/periodFilterOptions";

export type ActiveBorrowStatusFilter = "all" | "due" | "extended";
export type BorrowHistoryStatusFilter = "all" | "RETURNED" | "CANCELLED";
export type ReviewStatusFilter = "all" | ReviewStatusValue;

export type PeriodDated = {
  createdAt?: Date | string | null;
  dueDate?: Date | string | null;
  returnDate?: Date | string | null;
  renewalCount?: number;
  status?: string;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalDay(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Inclusive period check against a candidate date. */
export function inPeriod(
  date: Date | string | null | undefined,
  period: ListPeriod,
  now: Date = new Date(),
): boolean {
  if (period === "all") return true;
  const d = toDate(date);
  if (!d) return false;

  const todayStart = startOfLocalDay(now);
  if (period === "today") {
    return d.getTime() >= todayStart.getTime();
  }

  const days = period === "7days" ? 7 : 30;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d.getTime() >= cutoff.getTime();
}

/** Calendar-day overdue: dueDate local day strictly before today. */
export function isBorrowOverdue(
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  const due = toDate(dueDate);
  if (!due) return false;
  const dueDay = startOfLocalDay(due);
  const today = startOfLocalDay(now);
  return dueDay.getTime() < today.getTime();
}

function activeBorrowDate(record: PeriodDated): Date | string | null | undefined {
  return record.dueDate ?? record.createdAt;
}

function historyDate(record: PeriodDated): Date | string | null | undefined {
  return record.returnDate ?? record.createdAt;
}

export function filterActiveBorrows<T extends PeriodDated>(
  records: T[],
  period: ListPeriod,
  status: ActiveBorrowStatusFilter = "all",
  now: Date = new Date(),
): T[] {
  return records.filter((r) => {
    if (!inPeriod(activeBorrowDate(r), period, now)) return false;
    if (status === "due") return isBorrowOverdue(r.dueDate, now);
    if (status === "extended") return (r.renewalCount ?? 0) > 0;
    return true;
  });
}

export function filterPendingRequests<T extends PeriodDated>(
  records: T[],
  period: ListPeriod,
  now: Date = new Date(),
): T[] {
  return records.filter((r) => inPeriod(r.createdAt, period, now));
}

export function filterBorrowHistory<T extends PeriodDated>(
  records: T[],
  period: ListPeriod,
  status: BorrowHistoryStatusFilter = "all",
  now: Date = new Date(),
): T[] {
  return records.filter((r) => {
    if (!inPeriod(historyDate(r), period, now)) return false;
    if (status === "all") return true;
    return r.status === status;
  });
}

export function filterReviews<T extends { createdAt?: Date | string | null; status?: string }>(
  records: T[],
  period: ListPeriod,
  status: ReviewStatusFilter = "all",
  now: Date = new Date(),
): T[] {
  return records.filter((r) => {
    if (!inPeriod(r.createdAt, period, now)) return false;
    if (status === "all") return true;
    return r.status === status;
  });
}

function mutedIcon(surface: FilterSurface): string {
  return surface === "dark" ? "text-light-200/70" : "text-slate-500";
}

/** Active borrows: all / overdue / extended. */
export function activeBorrowStatusFilterOptions(
  surface: FilterSurface = "dark",
): FilterSelectOption[] {
  const muted = mutedIcon(surface);
  return [
    {
      value: "all",
      label: "All Status",
      icon: List,
      iconClassName: muted,
    },
    {
      value: "due",
      label: "Overdue",
      icon: AlarmClock,
      iconClassName: surface === "dark" ? "text-rose-300" : "text-rose-500",
    },
    {
      value: "extended",
      label: "Extended",
      icon: RefreshCw,
      iconClassName: surface === "dark" ? "text-violet-300" : "text-violet-500",
    },
  ];
}

/** Borrow history: all / returned / cancelled. */
export function borrowHistoryStatusFilterOptions(
  surface: FilterSurface = "dark",
): FilterSelectOption[] {
  const muted = mutedIcon(surface);
  return [
    {
      value: "all",
      label: "All Status",
      icon: List,
      iconClassName: muted,
    },
    {
      value: "RETURNED",
      label: "Returned",
      icon: CheckCircle2,
      iconClassName: surface === "dark" ? "text-emerald-300" : "text-emerald-500",
    },
    {
      value: "CANCELLED",
      label: "Cancelled",
      icon: XCircle,
      iconClassName: surface === "dark" ? "text-rose-300" : "text-rose-500",
    },
  ];
}

/** Type-only helper for Clear affordance checks. */
export function hasNonDefaultProfileFilters(opts: {
  period: ListPeriod;
  status?: string;
}): boolean {
  return opts.period !== "all" || (opts.status != null && opts.status !== "all");
}
