// Parent: REQ-0031 — pure deterministic helpers (no I/O)

import type {
  FineForecast,
  GenreDemandPressure,
  OverdueTrendPoint,
} from "./types";
import { computeLiveOutstandingFine as computeLiveOutstandingFineShared } from "@/lib/fines/liveFine";

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function safePercentage(numerator: number, denominator: number): number {
  return denominator > 0 ? round((100 * numerator) / denominator, 1) : 0;
}

export function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? round(numerator / denominator, 2) : 0;
}

/**
 * Live outstanding = sum(max(0, daysOverdue) × dailyRate).
 * Same product as the overdue table; does not write borrow_records.fine_amount.
 */
export function computeLiveOutstandingFine(
  overdueDayCounts: readonly number[],
  dailyRate: number,
): number {
  return computeLiveOutstandingFineShared(overdueDayCounts, dailyRate);
}

/** Advisory 7-day accrual if every active overdue loan stays open at dailyRate. */
export function computeFineForecast(input: {
  outstanding: number;
  overdueLoanCount: number;
  dailyRate: number;
  horizonDays?: number;
}): FineForecast {
  const horizonDays = input.horizonDays ?? 7;
  const rate = Math.max(0, input.dailyRate);
  const projectedAccrual = round(
    Math.max(0, input.overdueLoanCount) * rate * horizonDays,
    2,
  );
  const outstanding = round(Math.max(0, input.outstanding), 2);
  return {
    outstanding,
    projectedAccrual,
    total: round(outstanding + projectedAccrual, 2),
    dailyRate: rate,
    horizonDays,
  };
}

export function computeGenreDemandPressure(
  rows: { genre: string; borrows: number; copies: number }[],
): GenreDemandPressure[] {
  return rows.map((row) => ({
    genre: row.genre,
    borrows: row.borrows,
    copies: row.copies,
    pressure: safeRatio(row.borrows, row.copies),
  }));
}

export function normalizeOverdueTrend(
  rows: { date: string; overdueCount: number }[],
): OverdueTrendPoint[] {
  return rows.map((row) => ({
    date: row.date,
    overdueCount: Math.max(0, Math.floor(row.overdueCount)),
  }));
}
