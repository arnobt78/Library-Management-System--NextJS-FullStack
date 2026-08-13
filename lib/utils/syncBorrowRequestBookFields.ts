/**
 * Sync Borrow Queue / detail embedded book inventory fields after densify.
 * Kept separate from patchBorrowCaches / patchBookCaches to avoid import cycles.
 * Parent: Book Details DNA densify
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";

/**
 * Keep Borrow Queue / detail embedded inventory + waiting holds in sync with
 * books.detail / reservation densify (dialog Available/Waiting fallbacks).
 */
export function syncBorrowRequestBookFields(
  queryClient: QueryClient,
  bookId: string | null | undefined,
  args: {
    availableCopies?: number;
    totalCopies?: number;
    waitingHoldsDelta?: number;
  },
): void {
  if (!bookId) return;
  const hasAvailable = typeof args.availableCopies === "number";
  const hasTotal = typeof args.totalCopies === "number";
  const holdsDelta = args.waitingHoldsDelta ?? 0;
  if (!hasAvailable && !hasTotal && holdsDelta === 0) return;

  const patchRow = (
    row: BorrowRecordWithDetails,
  ): BorrowRecordWithDetails => {
    if (row.bookId !== bookId) return row;
    let next = row;
    if (hasAvailable) {
      next = { ...next, bookAvailableCopies: args.availableCopies };
    }
    if (hasTotal) {
      next = { ...next, bookTotalCopies: args.totalCopies };
    }
    if (holdsDelta !== 0) {
      const prev = next.bookWaitingHolds ?? 0;
      next = {
        ...next,
        bookWaitingHolds: Math.max(0, prev + holdsDelta),
      };
    }
    return next;
  };

  for (const [key, rows] of queryClient.getQueriesData<
    BorrowRecordWithDetails[]
  >({ queryKey: queryKeys.borrows.requestsRoot })) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    if (!rows.some((r) => r.bookId === bookId)) continue;
    queryClient.setQueryData(key, rows.map(patchRow));
  }

  for (const [key, detail] of queryClient.getQueriesData<
    BorrowRecordWithDetails
  >({ queryKey: queryKeys.borrows.requestDetailRoot })) {
    if (!detail || detail.bookId !== bookId) continue;
    queryClient.setQueryData(key, patchRow(detail));
  }
}

/**
 * Max WAITING holds for a book from cached Borrow Queue / detail rows.
 * Used by Return onMutate to skip available +1 when FIFO offer will net 0.
 */
export function getCachedBookWaitingHolds(
  queryClient: QueryClient,
  bookId: string | null | undefined,
): number {
  if (!bookId) return 0;
  let max = 0;
  for (const [, rows] of queryClient.getQueriesData<
    BorrowRecordWithDetails[]
  >({ queryKey: queryKeys.borrows.requestsRoot })) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (row.bookId !== bookId) continue;
      const n = row.bookWaitingHolds ?? 0;
      if (n > max) max = n;
    }
  }
  for (const [, detail] of queryClient.getQueriesData<
    BorrowRecordWithDetails
  >({ queryKey: queryKeys.borrows.requestDetailRoot })) {
    if (!detail || detail.bookId !== bookId) continue;
    const n = detail.bookWaitingHolds ?? 0;
    if (n > max) max = n;
  }
  return max;
}
