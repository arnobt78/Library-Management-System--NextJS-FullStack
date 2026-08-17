// Parent: REQ-0029 — fine_status helpers (migration 0017)

import type { FineStatus } from "./types";

export const FINE_STATUSES: readonly FineStatus[] = [
  "NONE",
  "ACCRUING",
  "STAMPED",
  "WAIVED",
  "PAID",
] as const;

export function isAccruingFineStatus(status: string | null | undefined): boolean {
  return status === "ACCRUING" || status === "STAMPED";
}

export function isFrozenFineStatus(status: string | null | undefined): boolean {
  return (
    status === "STAMPED" ||
    status === "WAIVED" ||
    status === "PAID" ||
    status === "NONE"
  );
}

/** Backfill mapping for migration 0017. */
export function inferFineStatusFromBorrow(input: {
  status: string;
  dueDate: string | Date | null;
  fineAmount: string | number | null;
  now?: Date;
}): FineStatus {
  const stored =
    typeof input.fineAmount === "number"
      ? input.fineAmount
      : parseFloat(String(input.fineAmount ?? "0"));
  const now = input.now ?? new Date();

  if (input.status === "BORROWED" && input.dueDate) {
    const due =
      input.dueDate instanceof Date
        ? input.dueDate
        : new Date(String(input.dueDate));
    if (!Number.isNaN(due.getTime()) && due < now) {
      return "ACCRUING";
    }
    return "NONE";
  }

  if (input.status === "RETURNED" && Number.isFinite(stored) && stored > 0) {
    return "STAMPED";
  }

  return "NONE";
}
