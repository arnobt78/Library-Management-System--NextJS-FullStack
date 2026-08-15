/**
 * Sync Borrow Queue / detail / profile embedded book fields after densify.
 * Kept separate from patchBorrowCaches / patchBookCaches to avoid import cycles.
 * Parent: Book Details DNA densify
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";

export type BorrowBookFieldPatch = {
  availableCopies?: number;
  totalCopies?: number;
  waitingHoldsDelta?: number;
  /** Catalog title/meta — keep My Profile / queue DNA in sync on book.update. */
  title?: string;
  author?: string;
  genre?: string | null;
  rating?: number | null;
  coverUrl?: string | null;
  coverColor?: string | null;
};

/**
 * Keep Borrow Queue / detail / user-borrow lists embedded inventory + title DNA
 * in sync with books.detail densify (dialog Available + profile cards).
 */
export function syncBorrowRequestBookFields(
  queryClient: QueryClient,
  bookId: string | null | undefined,
  args: BorrowBookFieldPatch,
): void {
  if (!bookId) return;
  const hasAvailable = typeof args.availableCopies === "number";
  const hasTotal = typeof args.totalCopies === "number";
  const holdsDelta = args.waitingHoldsDelta ?? 0;
  const hasTitle = typeof args.title === "string";
  const hasAuthor = typeof args.author === "string";
  const hasGenre = args.genre !== undefined;
  const hasRating = args.rating !== undefined;
  const hasCoverUrl = args.coverUrl !== undefined;
  const hasCoverColor = args.coverColor !== undefined;
  if (
    !hasAvailable &&
    !hasTotal &&
    holdsDelta === 0 &&
    !hasTitle &&
    !hasAuthor &&
    !hasGenre &&
    !hasRating &&
    !hasCoverUrl &&
    !hasCoverColor
  ) {
    return;
  }

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
    if (hasTitle) next = { ...next, bookTitle: args.title! };
    if (hasAuthor) next = { ...next, bookAuthor: args.author! };
    if (hasGenre) next = { ...next, bookGenre: args.genre ?? "" };
    if (hasRating && typeof args.rating === "number") {
      next = { ...next, bookRating: args.rating };
    }
    if (hasCoverUrl) next = { ...next, bookCoverUrl: args.coverUrl ?? null };
    if (hasCoverColor) {
      next = { ...next, bookCoverColor: args.coverColor ?? null };
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

  // My Profile borrow tabs — same embedded book DNA as admin queue.
  for (const [key, rows] of queryClient.getQueriesData<
    BorrowRecordWithDetails[]
  >({ queryKey: queryKeys.borrows.userRoot })) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    if (!rows.some((r) => r.bookId === bookId)) continue;
    queryClient.setQueryData(key, rows.map(patchRow));
  }

  // Active Holds cards embed book title/cover when reservation densify is warm.
  for (const [key, rows] of queryClient.getQueriesData<
    Array<{ bookId?: string; bookTitle?: string; [k: string]: unknown }>
  >({ queryKey: queryKeys.circulation.reservationsRoot })) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    if (!rows.some((r) => r.bookId === bookId)) continue;
    queryClient.setQueryData(
      key,
      rows.map((row) => {
        if (row.bookId !== bookId) return row;
        return {
          ...row,
          ...(hasTitle ? { bookTitle: args.title } : {}),
          ...(hasAuthor ? { bookAuthor: args.author } : {}),
          ...(hasCoverUrl ? { coverUrl: args.coverUrl } : {}),
          ...(hasCoverColor ? { coverColor: args.coverColor } : {}),
        };
      }),
    );
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
      if (row.bookId === bookId && typeof row.bookWaitingHolds === "number") {
        max = Math.max(max, row.bookWaitingHolds);
      }
    }
  }
  for (const [, detail] of queryClient.getQueriesData<BorrowRecordWithDetails>({
    queryKey: queryKeys.borrows.requestDetailRoot,
  })) {
    if (
      detail?.bookId === bookId &&
      typeof detail.bookWaitingHolds === "number"
    ) {
      max = Math.max(max, detail.bookWaitingHolds);
    }
  }
  return max;
}
