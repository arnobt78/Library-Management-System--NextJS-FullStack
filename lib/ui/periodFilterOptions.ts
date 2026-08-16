/**
 * Shared period FilterSelect options (Today / 7 / 30 / All).
 * Used by admin Activity History, queue Recent tables, and My Profile tab filters.
 * Insights ops period (7 / 30 / 90 / All) drives trends + monthly + overdue analysis.
 */
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  List,
} from "lucide-react";
import type { FilterSelectOption } from "@/components/ui/filter-select";
import type { FilterSurface } from "@/lib/ui/filterOptionStyles";

export type ListPeriod = "today" | "7days" | "30days" | "all";

/** Shared Insights window for monthly series, overdue analysis, and borrowing trends. */
export type InsightsOpsPeriod = "7days" | "30days" | "90days" | "all";

/** Map ops period → borrowingTrendsDays (API caps at 90). */
export function insightsOpsPeriodToDays(period: InsightsOpsPeriod): number {
  switch (period) {
    case "7days":
      return 7;
    case "30days":
      return 30;
    case "90days":
    case "all":
      return 90;
  }
}

/** How many trailing months from the 12-month SSR series to show. */
export function insightsOpsPeriodMonthCount(period: InsightsOpsPeriod): number {
  switch (period) {
    case "7days":
    case "30days":
      return 1;
    case "90days":
      return 3;
    case "all":
      return 12;
  }
}

/** Insights ops FilterSelect options (light admin). */
export function insightsOpsPeriodOptions(
  surface: FilterSurface = "light",
): FilterSelectOption[] {
  const muted = mutedIcon(surface);
  return [
    {
      value: "7days",
      label: "Last 7 Days",
      icon: CalendarRange,
      iconClassName: surface === "dark" ? "text-violet-300" : "text-violet-500",
    },
    {
      value: "30days",
      label: "Last 30 Days",
      icon: CalendarClock,
      iconClassName: surface === "dark" ? "text-amber-300" : "text-amber-500",
    },
    {
      value: "90days",
      label: "Last 90 Days",
      icon: CalendarDays,
      iconClassName: surface === "dark" ? "text-sky-300" : "text-sky-500",
    },
    {
      value: "all",
      label: surface === "dark" ? "All Time" : "All History",
      icon: List,
      iconClassName: muted,
    },
  ];
}

function mutedIcon(surface: FilterSurface): string {
  return surface === "dark" ? "text-light-200/70" : "text-slate-500";
}

/** Period options with surface-aware icon tones. */
export function periodFilterOptions(
  surface: FilterSurface = "light",
): FilterSelectOption[] {
  const muted = mutedIcon(surface);
  return [
    {
      value: "today",
      label: "Today",
      icon: CalendarDays,
      iconClassName: surface === "dark" ? "text-sky-300" : "text-sky-500",
    },
    {
      value: "7days",
      label: "Last 7 Days",
      icon: CalendarRange,
      iconClassName: surface === "dark" ? "text-violet-300" : "text-violet-500",
    },
    {
      value: "30days",
      label: "Last 30 Days",
      icon: CalendarClock,
      iconClassName: surface === "dark" ? "text-amber-300" : "text-amber-500",
    },
    {
      value: "all",
      // Dark (profile): All Time; light (admin activity): All History
      label: surface === "dark" ? "All Time" : "All History",
      icon: List,
      iconClassName: muted,
    },
  ];
}

/** Client-side FIFO feed period gate (Activity-style; no extra fetch). */
export function matchesListPeriod(
  at: string | Date | null | undefined,
  period: ListPeriod,
): boolean {
  if (period === "all") return true;
  if (!at) return false;
  const ts = at instanceof Date ? at.getTime() : new Date(at).getTime();
  if (Number.isNaN(ts)) return false;
  const now = new Date();
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return ts >= start.getTime();
  }
  if (period === "7days") {
    return ts >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
  }
  return ts >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
}

/**
 * Insights overdue table — severity buckets on daysOverdue
 * (chronic overdue is not hidden under short dueDate windows).
 */
export function matchesOverdueDaysPeriod(
  daysOverdue: number,
  period: ListPeriod,
): boolean {
  if (period === "all") return true;
  const d = Math.max(0, Number(daysOverdue) || 0);
  if (period === "today") return d >= 1 && d < 7;
  if (period === "7days") return d >= 7 && d < 30;
  return d >= 30;
}

/**
 * Insights Overdue Analysis — severity floors on daysOverdue
 * (e.g. 60-day overdue counts under 7/30/90).
 */
export function matchesOverdueOpsDaysPeriod(
  daysOverdue: number,
  period: InsightsOpsPeriod,
): boolean {
  if (period === "all") return true;
  const d = Math.max(0, Number(daysOverdue) || 0);
  if (period === "7days") return d >= 7;
  if (period === "30days") return d >= 30;
  return d >= 90;
}

/** Insights overdue table FilterSelect (severity labels; same ListPeriod values). */
export function overdueSeverityPeriodOptions(
  surface: FilterSurface = "light",
): FilterSelectOption[] {
  const muted = mutedIcon(surface);
  return [
    {
      value: "today",
      label: "1–6 Days",
      icon: CalendarDays,
      iconClassName: surface === "dark" ? "text-sky-300" : "text-sky-500",
    },
    {
      value: "7days",
      label: "7–29 Days",
      icon: CalendarRange,
      iconClassName: surface === "dark" ? "text-violet-300" : "text-violet-500",
    },
    {
      value: "30days",
      label: "30+ Days",
      icon: CalendarClock,
      iconClassName: surface === "dark" ? "text-amber-300" : "text-amber-500",
    },
    {
      value: "all",
      label: "All Overdue",
      icon: List,
      iconClassName: muted,
    },
  ];
}
