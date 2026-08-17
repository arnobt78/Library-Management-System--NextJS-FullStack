// Parent: REQ-0029, REQ-0031 — shared fine domain types

/** Lifecycle of a borrow fine (migration 0017). */
export type FineStatus =
  | "NONE"
  | "ACCRUING"
  | "STAMPED"
  | "WAIVED"
  | "PAID";

export interface FineRateHistoryRow {
  rate: number;
  effectiveFrom: Date | string;
  createdBy: string | null;
}

export interface LiveFineInput {
  status: string;
  dueDate: Date | string | null | undefined;
  storedFine: number | string | null | undefined;
  dailyRate: number;
  fineStatus?: FineStatus | string | null;
  now?: Date;
  /** Pro-rata segments (Wave C); empty = flat dailyRate for all overdue days. */
  rateHistory?: readonly FineRateHistoryRow[];
}
