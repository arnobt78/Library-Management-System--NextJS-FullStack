/**
 * Thin densify for book.write — detail + admin catalog + featured/related strips.
 * Used via commitMutationCache after invalidate.
 * Featured strip: replace on featured+active; fallback/evict on unfeature/deactivate
 * so soft-nav homepage never paints a stale hero (mirrors densifyRecommendationWrite).
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { BooksListResponse } from "@/lib/services/books";
import { ADMIN_BOOKS_UNFILTERED } from "@/lib/ui/adminListUniverse";
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
import { syncBorrowRequestBookFields } from "@/lib/utils/syncBorrowRequestBookFields";
import { mergeDensifiedDetail } from "@/lib/utils/mergeDensifiedDetail";

type BookLike = { id: string; [key: string]: unknown };

/** Detail densify keys that thin list/API patches must not wipe. */
const BOOK_DETAIL_DENSIFIED_KEYS = [
  "updatedByActor",
  "createdByActor",
] as const;

function titleOf(book: { title?: unknown }): string {
  return typeof book.title === "string" ? book.title : "";
}

/** Stable A-Z by title for catalog densify inserts. */
function sortBooksByTitle<T extends { title?: unknown }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
}

function toBookSnapshot(book: BookLike): AdminStatsBookSnapshot {
  return {
    id: book.id,
    isActive:
      typeof book.isActive === "boolean"
        ? book.isActive
        : (book.isActive as boolean | null | undefined),
    totalCopies:
      typeof book.totalCopies === "number" ? book.totalCopies : null,
    availableCopies:
      typeof book.availableCopies === "number" ? book.availableCopies : null,
    isbn: typeof book.isbn === "string" ? book.isbn : null,
    publisher: typeof book.publisher === "string" ? book.publisher : null,
    pageCount: typeof book.pageCount === "number" ? book.pageCount : null,
    title: typeof book.title === "string" ? book.title : null,
    author: typeof book.author === "string" ? book.author : null,
    rating: typeof book.rating === "number" ? book.rating : null,
    coverUrl: typeof book.coverUrl === "string" ? book.coverUrl : null,
    coverColor: typeof book.coverColor === "string" ? book.coverColor : null,
    genre: typeof book.genre === "string" ? book.genre : null,
    publicationYear:
      typeof book.publicationYear === "number" ||
      typeof book.publicationYear === "string"
        ? book.publicationYear
        : null,
    language: typeof book.language === "string" ? book.language : null,
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

/**
 * Sync Book Catalog nav pill from unfiltered universe `total` only.
 * Never Math.max across filtered caches — updates used to invent rows and inflate totals.
 */
function syncBooksNav(queryClient: QueryClient): void {
  const unfiltered = queryClient.getQueryData<BooksListResponse>(
    queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED),
  );
  if (unfiltered && typeof unfiltered.total === "number") {
    patchAdminNavCounts(queryClient, { books: unfiltered.total });
    return;
  }

  // Fallback: prefer the largest books[] length whose total matches length (healthy page).
  let best: number | null = null;
  for (const [, page] of queryClient.getQueriesData<BooksListResponse>({
    queryKey: queryKeys.books.adminRoot,
  })) {
    if (!page || typeof page.total !== "number") continue;
    if (page.books.length === page.total) {
      if (best === null || page.total < best) best = page.total;
    }
  }
  if (best !== null) {
    patchAdminNavCounts(queryClient, { books: best });
  }
}

/**
 * Patch one admin list page. On update (`allowInsert=false`), never invent into
 * filtered caches that lack the row — that inflated sidebar totals.
 */
function upsertInListResponse(
  prev: BooksListResponse | undefined,
  book: BookLike,
  allowInsert: boolean,
): BooksListResponse | undefined {
  if (!prev?.books) {
    // Do not invent a full list page from a single row.
    return prev;
  }
  const idx = prev.books.findIndex((b) => b.id === book.id);
  if (idx === -1) {
    if (!allowInsert) return prev;
    const books = sortBooksByTitle([
      book as unknown as BooksListResponse["books"][number],
      ...prev.books,
    ]);
    return {
      ...prev,
      books,
      total: prev.total + 1,
    };
  }

  const books = prev.books.map((b, i) =>
    i === idx ? ({ ...b, ...book } as BooksListResponse["books"][number]) : b,
  );
  return {
    ...prev,
    books,
    total: prev.total,
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

/** Active when isActive is true or unset (matches lendableBookCopies). */
function isActiveLike(book: BookLike): boolean {
  return book.isActive !== false;
}

/** Curated homepage hero: featured + active only. */
function isFeaturedHeroEligible(book: BookLike): boolean {
  return book.isFeatured === true && isActiveLike(book);
}

function readCachedIsFeatured(
  queryClient: QueryClient,
  bookId: string,
): boolean {
  const detail = queryClient.getQueryData<BookLike>(
    queryKeys.books.detail(bookId),
  );
  if (detail && typeof detail.isFeatured === "boolean") {
    return detail.isFeatured;
  }
  for (const [, page] of queryClient.getQueriesData<BooksListResponse>({
    queryKey: queryKeys.books.adminRoot,
  })) {
    const hit = page?.books?.find((b) => b.id === bookId) as
      | BookLike
      | undefined;
    if (hit && typeof hit.isFeatured === "boolean") return hit.isFeatured;
  }
  return false;
}

function isInFeaturedStrip(queryClient: QueryClient, bookId: string): boolean {
  for (const [, rows] of queryClient.getQueriesData<BookLike[]>({
    queryKey: queryKeys.books.featuredRoot,
  })) {
    if (rows?.some((b) => b.id === bookId)) return true;
  }
  return false;
}

/**
 * Newest active catalog row for homepage fallback (mirrors getHomepageHeroBook).
 * Prefers another isFeatured row if densify left one; else createdAt desc.
 */
function pickHomepageHeroFallback(
  queryClient: QueryClient,
  excludeId: string,
): BookLike | null {
  const unfiltered = queryClient.getQueryData<BooksListResponse>(
    queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED),
  );
  const rows = (unfiltered?.books ?? []) as unknown as BookLike[];
  const active = rows.filter(
    (b) => b.id !== excludeId && isActiveLike(b),
  );
  const featured = active.find((b) => b.isFeatured === true);
  if (featured) return featured;

  const sorted = [...active].sort((a, b) => {
    const ta = Date.parse(String(a.createdAt ?? "")) || 0;
    const tb = Date.parse(String(b.createdAt ?? "")) || 0;
    return tb - ta;
  });
  return sorted[0] ?? null;
}

/**
 * Mirror DB featured exclusivity on cached admin list pages — never invent rows.
 */
function clearSiblingFeaturedFlags(
  queryClient: QueryClient,
  featuredBookId: string,
): void {
  queryClient.setQueriesData<BooksListResponse>(
    { queryKey: queryKeys.books.adminRoot },
    (old) => {
      if (!old?.books) return old;
      let changed = false;
      const books = old.books.map((b) => {
        if (b.id === featuredBookId) return b;
        const row = b as unknown as BookLike;
        if (row.isFeatured !== true) return b;
        changed = true;
        return { ...b, isFeatured: false };
      });
      return changed ? { ...old, books } : old;
    },
  );
}

/**
 * Homepage featured strip densify (soft-nav must not paint stale hero).
 * Featured+active → replace strip with [book]. Lost hero → fallback or evict
 * so seedFromSsrIfEmpty can take SSR. Ordinary non-hero edits leave the strip alone.
 */
function syncFeaturedStripOnBookWrite(
  queryClient: QueryClient,
  book: BookLike,
  previousWasFeatured: boolean,
): void {
  if (isFeaturedHeroEligible(book)) {
    queryClient.setQueriesData<BookLike[]>(
      { queryKey: queryKeys.books.featuredRoot },
      () => [book],
    );
    clearDensifiedEmpty(queryKeys.books.featuredRoot);
    return;
  }

  const wasInStrip = isInFeaturedStrip(queryClient, book.id);
  // Title/copies edit of current strip member without clearing flags — patch in place.
  if (
    wasInStrip &&
    book.isActive !== false &&
    book.isFeatured !== false
  ) {
    queryClient.setQueriesData<BookLike[]>(
      { queryKey: queryKeys.books.featuredRoot },
      (old) => {
        const next = patchBookArray(old, book);
        if (next && next.length > 0) {
          clearDensifiedEmpty(queryKeys.books.featuredRoot);
        }
        return next;
      },
    );
    return;
  }

  if (!wasInStrip && !previousWasFeatured) {
    return;
  }

  // Hero lost (unfeatured / deactivated) — remove then seed fallback or evict.
  queryClient.setQueriesData<BookLike[]>(
    { queryKey: queryKeys.books.featuredRoot },
    (old) => removeFromBookArray(old, new Set([book.id])),
  );

  const fallback = pickHomepageHeroFallback(queryClient, book.id);
  if (fallback) {
    queryClient.setQueriesData<BookLike[]>(
      { queryKey: queryKeys.books.featuredRoot },
      () => [fallback],
    );
    clearDensifiedEmpty(queryKeys.books.featuredRoot);
    return;
  }

  queryClient.removeQueries({ queryKey: queryKeys.books.featuredRoot });
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
  // Read featured flag before detail overwrite (strip sync needs pre-mutation truth).
  const previousWasFeatured = readCachedIsFeatured(queryClient, book.id);
  // Create-only insert into admin lists; updates must not invent into filtered caches.
  const allowInsert = previous == null;

  queryClient.setQueryData(queryKeys.books.detail(book.id), (prev: unknown) => {
    const incoming = book as BookLike;
    if (prev && typeof prev === "object") {
      // Thin patches omit updatedByActor — keep densified PersonAttribution DNA.
      return mergeDensifiedDetail(
        prev as BookLike,
        incoming,
        BOOK_DETAIL_DENSIFIED_KEYS as unknown as readonly (keyof BookLike)[],
      );
    }
    return incoming;
  });

  queryClient.setQueriesData<BooksListResponse>(
    { queryKey: queryKeys.books.adminRoot },
    (old) => upsertInListResponse(old, book, allowInsert),
  );

  // Featured exclusivity on admin badges — mirror clearOtherFeatured.
  if (isFeaturedHeroEligible(book)) {
    clearSiblingFeaturedFlags(queryClient, book.id);
  }

  // Homepage featured strip — replace / fallback / evict (no stale soft-nav hero).
  syncFeaturedStripOnBookWrite(queryClient, book, previousWasFeatured);

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
  // Borrow Queue / detail inventory fallbacks after catalog edit.
  const available =
    typeof book.availableCopies === "number" ? book.availableCopies : undefined;
  const total =
    typeof book.totalCopies === "number" ? book.totalCopies : undefined;
  if (available !== undefined || total !== undefined) {
    syncBorrowRequestBookFields(queryClient, book.id, {
      ...(available !== undefined ? { availableCopies: available } : {}),
      ...(total !== undefined ? { totalCopies: total } : {}),
    });
  }
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
