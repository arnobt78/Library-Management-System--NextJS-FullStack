// Parent: REQ-0029 — shared display-fine mapper for SSR loaders

import { computeLiveFineForRow, formatFineAmount } from "./liveFine";
import type { FineRateHistoryRow } from "./types";

export type BorrowFineDisplayRow = {
  status: string;
  dueDate: Date | string | null;
  fineAmount: number | string | null;
  fineStatus?: string | null;
};

/** Live display fine for one borrow row (pro-rata when rate history exists). */
export function computeDisplayFineForBorrowRow(
  row: BorrowFineDisplayRow,
  dailyRate: number,
  rateHistory: readonly FineRateHistoryRow[] | undefined,
  now: Date = new Date(),
): { displayFineAmount: string; liveAmount: number } {
  const liveAmount = computeLiveFineForRow({
    status: row.status,
    dueDate: row.dueDate,
    storedFine: row.fineAmount,
    dailyRate,
    fineStatus: row.fineStatus,
    rateHistory,
    now,
  });
  return {
    displayFineAmount: formatFineAmount(liveAmount),
    liveAmount,
  };
}
