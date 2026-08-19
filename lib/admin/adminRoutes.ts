/**
 * Admin route href helpers — single source for catalog/borrow detail links.
 * Parent: admin book link sweep (User 360 / queue / Insights parity).
 */

/** Admin book catalog detail — `/admin/books/[id]`. */
export function adminBookDetailHref(bookId: string): string {
  return `/admin/books/${bookId}`;
}

/** Admin borrow request detail — `/admin/book-requests/[id]`. */
export function adminBorrowRequestHref(recordId: string): string {
  return `/admin/book-requests/${recordId}`;
}

/** Admin book review moderation detail. */
export function adminBookReviewDetailHref(reviewId: string): string {
  return `/admin/book-reviews/${reviewId}`;
}
