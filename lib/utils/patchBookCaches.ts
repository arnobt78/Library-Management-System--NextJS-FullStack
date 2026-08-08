/**
 * Thin densify for book.write — detail + admin catalog + featured/related strips.
 * Used via commitMutationCache after invalidate.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { BooksListResponse } from "@/lib/services/books";
import {
  markDensifiedEmpty,
  clearDensifiedEmpty,
} from "@/lib/utils/queryCacheLists";
import { patchAdminNavCounts } from "@/lib/utils/patchAdminNavCounts";
import {
  patchAdminStatsOnBookChange,
  patchAdminStatsOnBookDelete,
  type AdminStatsBookSnapshot,
} from "@/lib/utils/patchAdminStatsCaches";
import { evictAnalyticsCaches } from "@/lib/utils/evictAnalyticsCaches";

type BookLike = { id: string; [key: string]: unknown };

function toBookSnapshot(book: BookLike): AdminStatsBookSnapshot {
  return {
    id: book.id,
    isActive:
      typeof book.isActive === "boolean" ? book.isActive : (book.isActive as boolean | null | undefined),
    totalCopies:
      typeof book.totalCopies === "number" ? book.totalCopies : null,
    availableCopies:
      typeof book.availableCopies === "number" ? book.availableCopies : null,
    isbn: typeof book.isbn === "string" ? book.isbn : null,
    publisher: typeof book.publisher === "string" ? book.publisher : null,
    pageCount: typeof book.pageCount === "number" ? book.pageCount : null,
  };
}

function findCachedBookSnapshot(
  queryClient: QueryClient,
  bookId: string,
): AdminStatsBookSnapshot | null {
  const detail = queryClient.getQueryData<BookLike>(
    queryKeys.books.detail(bookId),
  );
  if (detail?.id) return toBookSnapshot(detail);

  for (const [, page] of queryClient.getQueriesData<BooksListResponse>({
    queryKey: queryKeys.books.adminRoot,
  })) {
    const hit = page?.books?.find((b) => b.id === bookId);
    if (hit) return toBookSnapshot(hit as unknown as BookLike);
  }
  return null;
}

/** Sync Book Catalog pill from densest cached admin list `total`. */
function syncBooksNav(queryClient: QueryClient): void {
  let found = false;
  let densest = 0;
  for (const [, page] of queryClient.getQueriesData<BooksListResponse>({
    queryKey: queryKeys.books.adminRoot,
  })) {
    if (!page || typeof page.total !== "number") continue;
    found = true;
    densest = Math.max(densest, page.total);
  }
  if (found) {
    patchAdminNavCounts(queryClient, { books: densest });
  }
}

function upsertInListResponse(
  prev: BooksListResponse | undefined,
  book: BookLike,
): BooksListResponse | undefined {
  if (!prev?.books) {
    // Do not invent a full list page from a single row.
    return prev;
  }
  const idx = prev.books.findIndex((b) => b.id === book.id);
  const books =
    idx === -1
      ? ([book, ...prev.books] as BooksListResponse["books"])
      : (prev.books.map((b, i) =>
          i === idx ? { ...b, ...book } : b,
        ) as BooksListResponse["books"]);
  return {
    ...prev,
    books,
    total: idx === -1 ? prev.total + 1 : prev.total,
  };
}

function patchBookArray(
  rows: BookLike[] | undefined,
  book: BookLike,
): BookLike[] | undefined {
  if (!rows) return rows;
  const idx = rows.findIndex((b) => b.id === book.id);
  if (idx === -1) return rows;
  return rows.map((b, i) => (i === idx ? { ...b, ...book } : b));
}

function removeFromBookArray(
  rows: BookLike[] | undefined,
  idSet: Set<string>,
): BookLike[] | undefined {
  if (!rows) return rows;
  return rows.filter((b) => !idSet.has(b.id));
}

/**
 * Bump availableCopies on cached /all-books (adminRoot) list rows.
 * Borrow approve/return densify — soft-nav catalog must not show stale copies.
 */
export function patchAdminListAvailability(
  queryClient: QueryClient,
  bookId: string,
  availableCopies: number,
): void {
  queryClient.setQueriesData<BooksListResponse>(
    { queryKey: queryKeys.books.adminRoot },
    (old) => {
      if (!old?.books) return old;
      let changed = false;
      const books = old.books.map((b) => {
        if (b.id !== bookId) return b;
        changed = true;
        return { ...b, availableCopies };
      });
      return changed ? { ...old, books } : old;
    },
  );
}

/** Upsert book detail + patch cached admin list + featured/related strips. */
export function densifyBookWrite(
  queryClient: QueryClient,
  book: BookLike | null | undefined,
): void {
  if (!book?.id) return;

  // Snapshot before overwrite — overview Total Books / Availability / Book Information.
  const previous = findCachedBookSnapshot(queryClient, book.id);

  queryClient.setQueryData(queryKeys.books.detail(book.id), (prev: unknown) =>
    prev && typeof prev === "object"
      ? { ...(prev as object), ...book }
      : book,
  );

  queryClient.setQueriesData<BooksListResponse>(
    { queryKey: queryKeys.books.adminRoot },
    (old) => upsertInListResponse(old, book),
  );

  // Homepage featured strip — patch in place when cached (no invent).
  queryClient.setQueriesData<BookLike[]>(
    { queryKey: queryKeys.books.featuredRoot },
    (old) => {
      const next = patchBookArray(old, book);
      if (next && next.length > 0) clearDensifiedEmpty(queryKeys.books.featuredRoot);
      return next;
    },
  );

  // Book-detail related strips — patch matching ids when cached.
  queryClient.setQueriesData<BookLike[]>(
    { queryKey: queryKeys.books.relatedRoot },
    (old) => patchBookArray(old, book),
  );

  syncBooksNav(queryClient);
  patchAdminStatsOnBookChange(queryClient, {
    previous,
    next: toBookSnapshot(book),
  });
  // Insights charts — evict so soft-nav refetches (no invent series densify).
  evictAnalyticsCaches(queryClient);
}

/** Drop deleted book ids from detail + admin list + featured/related caches. */
export function densifyBookDelete(
  queryClient: QueryClient,
  bookIds: string[],
): void {
  const snapshots = bookIds
    .map((id) => findCachedBookSnapshot(queryClient, id))
    .filter((b): b is AdminStatsBookSnapshot => Boolean(b));

  for (const id of bookIds) {
    queryClient.removeQueries({ queryKey: queryKeys.books.detail(id) });
  }
  const idSet = new Set(bookIds);
  queryClient.setQueriesData<BooksListResponse>(
    { queryKey: queryKeys.books.adminRoot },
    (old) => {
      if (!old?.books) return old;
      const books = old.books.filter((b) => !idSet.has(b.id));
      const removed = old.books.length - books.length;
      return {
        ...old,
        books,
        total: Math.max(0, old.total - removed),
      };
    },
  );

  queryClient.setQueriesData<BookLike[]>(
    { queryKey: queryKeys.books.featuredRoot },
    (old) => removeFromBookArray(old, idSet),
  );
  for (const [key, rows] of queryClient.getQueriesData<BookLike[]>({
    queryKey: queryKeys.books.featuredRoot,
  })) {
    if (Array.isArray(rows) && rows.length === 0) markDensifiedEmpty(key);
  }

  queryClient.setQueriesData<BookLike[]>(
    { queryKey: queryKeys.books.relatedRoot },
    (old) => removeFromBookArray(old, idSet),
  );
  for (const [key, rows] of queryClient.getQueriesData<BookLike[]>({
    queryKey: queryKeys.books.relatedRoot,
  })) {
    if (Array.isArray(rows) && rows.length === 0) markDensifiedEmpty(key);
  }

  // Home recommendations — drop deleted ids (invalidate alone can soft-nav stale).
  queryClient.setQueriesData<BookLike[]>(
    { queryKey: queryKeys.books.recommendationsRoot },
    (old) => removeFromBookArray(old, idSet),
  );
  for (const [key, rows] of queryClient.getQueriesData<BookLike[]>({
    queryKey: queryKeys.books.recommendationsRoot,
  })) {
    if (Array.isArray(rows) && rows.length === 0) markDensifiedEmpty(key);
  }

  for (const id of bookIds) {
    queryClient.removeQueries({ queryKey: queryKeys.books.borrowStats(id) });
  }

  syncBooksNav(queryClient);
  for (const snap of snapshots) {
    patchAdminStatsOnBookDelete(queryClient, snap);
  }
  evictAnalyticsCaches(queryClient);
}
