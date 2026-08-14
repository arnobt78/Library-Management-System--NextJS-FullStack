/**
 * Book detail densify keys — thin GET / list omit these; merge must preserve.
 * Shared by densifyBookWrite, useBook, PrefetchLink (admin + public book-detail).
 * Parent: Admin Book Detail FIFO-25 Activity / densify wipe closeout
 */

export const BOOK_DETAIL_DENSIFIED_KEYS = [
  "createdByActor",
  "updatedByActor",
  "auditEvents",
] as const satisfies ReadonlyArray<keyof Book>;
