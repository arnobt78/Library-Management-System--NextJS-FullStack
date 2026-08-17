// Parent: REQ-0031; TC-0095, TC-0096
import { describe, expect, it } from "vitest";
import {
  computeFineForecast,
  computeGenreDemandPressure,
  computeLiveOutstandingFine,
  normalizeOverdueTrend,
  safePercentage,
  safeRatio,
} from "./formulas";

describe("deterministic insight formulas", () => {
  it("calculates versioned percentage and ratio precision", () => {
    expect(safePercentage(2, 3)).toBe(66.7);
    expect(safeRatio(5, 4)).toBe(1.25);
  });

  it("returns zero for every zero-denominator formula", () => {
    expect(safePercentage(0, 0)).toBe(0);
    expect(safeRatio(10, 0)).toBe(0);
  });

  it("computes live outstanding from overdue days × daily rate", () => {
    expect(computeLiveOutstandingFine([46, 15, 4], 0.5)).toBe(32.5);
    expect(computeLiveOutstandingFine([], 0.5)).toBe(0);
    expect(computeLiveOutstandingFine([-2, 0], 0.5)).toBe(0);
  });

  it("computes advisory fine forecast from overdue count × rate × horizon", () => {
    expect(
      computeFineForecast({
        outstanding: 10,
        overdueLoanCount: 2,
        dailyRate: 1,
        horizonDays: 7,
      }),
    ).toEqual({
      outstanding: 10,
      projectedAccrual: 14,
      total: 24,
      dailyRate: 1,
      horizonDays: 7,
    });
  });

  it("maps genre demand pressure with safeRatio", () => {
    expect(
      computeGenreDemandPressure([
        { genre: "Sci-Fi", borrows: 10, copies: 4 },
        { genre: "Empty", borrows: 1, copies: 0 },
      ]),
    ).toEqual([
      { genre: "Sci-Fi", borrows: 10, copies: 4, pressure: 2.5 },
      { genre: "Empty", borrows: 1, copies: 0, pressure: 0 },
    ]);
  });

  it("normalizes overdue trend points", () => {
    expect(
      normalizeOverdueTrend([
        { date: "2026-08-01", overdueCount: 3.7 },
        { date: "2026-08-02", overdueCount: -1 },
      ]),
    ).toEqual([
      { date: "2026-08-01", overdueCount: 3 },
      { date: "2026-08-02", overdueCount: 0 },
    ]);
  });
});
