/**
 * Fetch book detail while preserving densified actors + Activity on books.detail.
 * Used by useBook queryFn and PrefetchLink (public + admin catalog share one key).
 * Parent: densify wipe closeout
 */

import type { QueryClient } from "@tanstack/react-query";
import { BOOK_DETAIL_DENSIFIED_KEYS } from "@/lib/books/bookDetailDensifyKeys";
import { queryKeys } from "@/lib/query/keys";
import { getBook } from "@/lib/services/books";
import { mergeDensifiedDetail } from "@/lib/utils/mergeDensifiedDetail";

/** Thin API + merge — never blank densified stamps/timeline on invalidate/prefetch. */
export async function fetchBookDetailPreservingDensify(
  queryClient: QueryClient,
  bookId: string,
): Promise<Book> {
  const fresh = await getBook(bookId);
  const prev = queryClient.getQueryData<Book>(queryKeys.books.detail(bookId));
  return mergeDensifiedDetail(
    prev,
    fresh,
    BOOK_DETAIL_DENSIFIED_KEYS as unknown as readonly (keyof Book)[],
  );
}
