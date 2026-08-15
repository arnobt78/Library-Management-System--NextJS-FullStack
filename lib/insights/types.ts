// Parent: REQ-0031 — deterministic library insights (no external LLM)

export interface OverdueTrendPoint {
  date: string;
  overdueCount: number;
}

export interface FineForecast {
  /** Current outstanding fine total on active overdue loans. */
  outstanding: number;
  /** Advisory accrual if overdue loans remain open for horizonDays at dailyRate. */
  projectedAccrual: number;
  /** outstanding + projectedAccrual (advisory). */
  total: number;
  dailyRate: number;
  horizonDays: number;
}

export interface GenreDemandPressure {
  genre: string;
  borrows: number;
  copies: number;
  /** borrows / copies (safeRatio). */
  pressure: number;
}

export interface DeterministicInsights {
  formulaVersion: "C2-v2";
  periodStart: string;
  periodEnd: string;
  circulation30Days: number;
  onTimeReturnRate: number;
  overdueRatio: number;
  outstandingFineTotal: number;
  demandToCopyRatio: number;
  holdPressure: number;
  renewalRate: number;
  /** Last 14 calendar days: loans past due and still out at end of day. */
  overdueTrend: OverdueTrendPoint[];
  /** Advisory fine projection — never mutates fines. */
  fineForecast: FineForecast;
  /** Top genres by recent borrows with demand/copy pressure. */
  genreDemandPressure: GenreDemandPressure[];
}
