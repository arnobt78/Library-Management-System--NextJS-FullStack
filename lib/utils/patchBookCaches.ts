/**
 * Thin densify for book.write — detail + admin catalog + featured/related strips.
 * Used via commitMutationCache after invalidate.
 * Featured strip: replace on featured+active; fallback/evict on unfeature/deactivate
 * so soft-nav homepage never paints a stale hero (mirrors densifyRecommendationWrite).
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { BooksListResponse, BookFilters } from "@/lib/services/books";
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
import { bookAuditLabel } from "@/lib/admin/bookAuditLabel";
import { BOOK_DETAIL_DENSIFIED_KEYS } from "@/lib/books/bookDetailDensifyKeys";

type BookLike = {
  id: string;
  [key: string]: unknown;
  auditEvents?: TicketActivityEvent[];
  createdByActor?: {
    id: string;
    fullName: string;
    email: string;
    universityCard: string | null;
  } | null;
  updatedByActor?: {
    id: string;
    fullName: string;
    email: string;
    universityCard: string | null;
  } | null;
};

/** Match review/borrow detail Activity FIFO (User 360 DNA). */
const BOOK_AUDIT_FIFO = 25;

/**
 * Coerce list `total` — pg count(*) and densify `+ 1` must never leave strings
 * (`"17"+1` → `"171"`) or NaN in RQ cache.
 */
function finiteTotal(
  prev: Pick<BooksListResponse, "total" | "books"> | undefined,
): number {
  if (!prev) return 0;
  const n = Number(prev.total);
  if (Number.isFinite(n) && n >= 0) return n;
  return prev.books?.length ?? 0;
}

function isFullUniverseDump(
  limit: number,
  filtersLimit?: number,
): boolean {
  const floor = ADMIN_BOOKS_UNFILTERED.limit ?? 1000;
  return limit >= floor || (filtersLimit ?? 0) >= floor;
}

/**
 * After universe absolute reconcile, stamp the same total onto warm unfiltered
 * thin keys (limit:12 / limit:1 / sort) so badge/pagination cannot drift.
 * Skips when the universe key is an incomplete clone (partial books[]).
 */
function syncUnfilteredThinTotalsFromUniverse(
  queryClient: QueryClient,
): void {
  const universe = queryClient.getQueryData<BooksListResponse>(
    queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED),
  );
  if (!universe?.books) return;
  const universeTotal = finiteTotal(universe);
  const len = universe.books.length;
  // Incomplete dumps (thin page cloned into universe) must not stomp pagination.
  if (len !== universeTotal) return;

  for (const [queryKey, page] of queryClient.getQueriesData<BooksListResponse>({
    queryKey: queryKeys.books.adminRoot,
  })) {
    if (!Array.isArray(queryKey) || !page?.books) continue;
    const filters = (queryKey[1] as BookFilters | undefined) ?? {};
    if (!isUnfilteredBookListFilters(filters)) continue;
    if (finiteTotal(page) === universeTotal) continue;
    const limit =
      page.limit || filters.limit || Math.max(page.books.length, 1);
    if (isFullUniverseDump(limit, filters.limit)) continue;
    queryClient.setQueryData(queryKey, {
      ...page,
      total: universeTotal,
      totalPages: Math.max(1, Math.ceil(universeTotal / limit) || 1),
    });
  }
}

function titleOf(book: { title?: unknown }): string {
  return typeof book.title === "string" ? book.title : "";
}

/** Stable A-Z by title for catalog densify inserts. */
function sortBooksByTitle<T extends { title?: unknown }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
}

/** Honor list `sort` when inventing into paginated all-books pages. */
function sortBooksForList<
  T extends {
    title?: unknown;
    author?: unknown;
    rating?: unknown;
    createdAt?: unknown;
  },
>(rows: T[], sort: BookFilters["sort"] | undefined): T[] {
  const copy = [...rows];
  switch (sort) {
    case "author":
      return copy.sort((a, b) =>
        String(a.author ?? "").localeCompare(String(b.author ?? "")),
      );
    case "rating":
      return copy.sort(
        (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0),
      );
    case "date":
      return copy.sort((a, b) =>
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
      );
    case "title":
    default:
      return sortBooksByTitle(copy);
  }
}

/**
 * Patch one admin/public list page. Create invents only into unfiltered pages
 * and respects page/limit/sort so limit-12 `/all-books` never grows past limit.
 * Updates never invent into filtered caches that lack the row.
 */
function upsertInListResponse(
  prev: BooksListResponse | undefined,
  book: BookLike,
  allowInsert: boolean,
  filters: BookFilters = {},
): BooksListResponse | undefined {
  if (!prev?.books) {
    // Do not invent a full list page from a single row.
    return prev;
  }
  const idx = prev.books.findIndex((b) => b.id === book.id);
  if (idx === -1) {
    if (!allowInsert) return prev;
    // Filtered genre/search/etc. — wait for refetch; do not invent membership.
    if (!isUnfilteredBookListFilters(filters)) return prev;

    const page = prev.page || filters.page || 1;
    let limit =
      prev.limit || filters.limit || Math.max(prev.books.length, 1);
    const nextTotal = finiteTotal(prev) + 1;
    const totalPages = Math.max(1, Math.ceil(nextTotal / limit) || 1);

    // Later pages: bump total only — membership requires the full catalog.
    if (page > 1) {
      return {
        ...prev,
        total: nextTotal,
        totalPages,
        limit,
        page,
      };
    }

    const merged = sortBooksForList(
      [
        book as unknown as BooksListResponse["books"][number],
        ...prev.books,
      ],
      filters.sort ?? "title",
    );

    // Universe / full-dump keys (filters.limit or prev.limit ≥ 1000) must keep
    // every row. Legacy SSR seeded limit===length onto ADMIN_BOOKS_UNFILTERED;
    // filters still carry limit:1000 so we expand instead of slice(0, 17).
    const preferFullUniverse = isFullUniverseDump(limit, filters.limit);
    if (preferFullUniverse) {
      limit = Math.max(
        limit,
        filters.limit ?? 0,
        ADMIN_BOOKS_UNFILTERED.limit ?? 1000,
        merged.length,
      );
      return {
        ...prev,
        books: merged,
        // Absolute: full dumps must match length (never string concat / drift).
        total: merged.length,
        totalPages: Math.max(1, Math.ceil(merged.length / limit) || 1),
        limit,
        page,
      };
    }

    return {
      ...prev,
      books: merged.slice(0, limit),
      total: nextTotal,
      totalPages,
      limit,
      page,
    };
  }

  const books = prev.books.map((b, i) =>
    i === idx ? ({ ...b, ...book } as BooksListResponse["books"][number]) : b,
  );
  const preferFullUniverse = isFullUniverseDump(
    prev.limit || filters.limit || books.length,
    filters.limit,
  );
  const coerced = finiteTotal(prev);
  // Absolute length only when the dump already held every row.
  const total =
    preferFullUniverse && books.length >= coerced ? books.length : coerced;
  return {
    ...prev,
    books,
    total,
  };
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
  if (unfiltered?.books) {
    const preferFullUniverse = isFullUniverseDump(
      unfiltered.limit ?? 0,
      ADMIN_BOOKS_UNFILTERED.limit,
    );
    const coerced = finiteTotal(unfiltered);
    // Prefer max(total, length) on universe dumps so a drifted low total
    // (badge 16) cannot lag KPI length (17), while thin pages keep SSR total.
    const booksCount = preferFullUniverse
      ? Math.max(coerced, unfiltered.books.length)
      : coerced > 0
        ? coerced
        : unfiltered.books.length;
    patchAdminNavCounts(queryClient, { books: booksCount });
    return;
  }

  // Fallback: prefer the largest books[] length whose total matches length (healthy page).
  let best: number | null = null;
  for (const [, page] of queryClient.getQueriesData<BooksListResponse>({
    queryKey: queryKeys.books.adminRoot,
  })) {
    if (!page?.books) continue;
    const total = finiteTotal(page);
    if (page.books.length === total) {
      if (best === null || total < best) best = total;
    }
  }
  if (best !== null) {
    patchAdminNavCounts(queryClient, { books: best });
  }
}

/**
 * Rebuild Genre filter options from warm unfiltered catalog (count-safe:
 * shared genres stay while any title remains). Cold catalog → invalidate only.
 */
function densifyBookGenres(queryClient: QueryClient): void {
  const unfiltered = queryClient.getQueryData<BooksListResponse>(
    queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED),
  );
  let source: BooksListResponse | undefined = unfiltered;
  if (!source?.books) {
    // Prefer a healthy unfiltered page (books.length === total) over partial pages.
    for (const [, page] of queryClient.getQueriesData<BooksListResponse>({
      queryKey: queryKeys.books.adminRoot,
    })) {
      if (!page?.books || typeof page.total !== "number") continue;
      if (page.books.length === page.total) {
        source = page;
        break;
      }
    }
  }
  if (source?.books) {
    const genres = [
      ...new Set(
        source.books
          .map((b) => (typeof b.genre === "string" ? b.genre.trim() : ""))
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
    queryClient.setQueryData(queryKeys.books.genres, genres);
    return;
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.books.genresRoot });
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

/** Filters that affect membership (page/sort/limit do not). */
function isUnfilteredBookListFilters(
  filters: BookFilters | undefined,
): boolean {
  if (!filters) return true;
  const hasSearch = Boolean(filters.search?.trim());
  const hasGenre = Boolean(filters.genre?.trim());
  const hasRating =
    typeof filters.rating === "number" &&
    !Number.isNaN(filters.rating) &&
    filters.rating > 0;
  const hasAvail =
    Boolean(filters.availability) && filters.availability !== "all";
  return !hasSearch && !hasGenre && !hasRating && !hasAvail;
}

function bookListFilterIdentity(filters: BookFilters | undefined): string {
  return JSON.stringify({
    search: filters?.search?.trim() ?? "",
    genre: filters?.genre?.trim() ?? "",
    availability:
      filters?.availability && filters.availability !== "all"
        ? filters.availability
        : "",
    rating:
      typeof filters?.rating === "number" && filters.rating > 0
        ? filters.rating
        : "",
    sort: filters?.sort ?? "",
    limit: filters?.limit ?? "",
  });
}

/** Cheap membership for filtered-list total decrement from pre-delete snapshots. */
function snapshotMatchesBookFilters(
  snap: AdminStatsBookSnapshot,
  filters: BookFilters | undefined,
): boolean {
  if (!filters || isUnfilteredBookListFilters(filters)) return true;
  if (filters.genre?.trim() && snap.genre !== filters.genre) return false;
  if (
    typeof filters.rating === "number" &&
    filters.rating > 0 &&
    (typeof snap.rating !== "number" || snap.rating < filters.rating)
  ) {
    return false;
  }
  if (filters.availability === "available") {
    if ((snap.availableCopies ?? 0) <= 0) return false;
  } else if (filters.availability === "unavailable") {
    if ((snap.availableCopies ?? 0) > 0) return false;
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    const title = (snap.title ?? "").toLowerCase();
    const author = (snap.author ?? "").toLowerCase();
    if (!title.includes(q) && !author.includes(q)) return false;
  }
  return true;
}

/**
 * Strip deleted ids from all-books list pages, fix totals (incl. limit:1 universe),
 * backfill page holes from the next warm page, else invalidate incomplete pages.
 */
function densifyBookListDeletes(
  queryClient: QueryClient,
  bookIds: string[],
  snapshots: AdminStatsBookSnapshot[],
): void {
  const idSet = new Set(bookIds);
  type ListEntry = {
    queryKey: readonly unknown[];
    filters: BookFilters;
    data: BooksListResponse;
  };

  const entries: ListEntry[] = [];
  for (const [queryKey, data] of queryClient.getQueriesData<BooksListResponse>({
    queryKey: queryKeys.books.adminRoot,
  })) {
    if (!data?.books || !Array.isArray(queryKey)) continue;
    const filters = (queryKey[1] as BookFilters | undefined) ?? {};
    entries.push({ queryKey, filters, data });
  }

  const groups = new Map<string, ListEntry[]>();
  for (const entry of entries) {
    const identity = bookListFilterIdentity(entry.filters);
    const group = groups.get(identity) ?? [];
    group.push(entry);
    groups.set(identity, group);
  }

  const keysNeedingRefetch: (readonly unknown[])[] = [];

  for (const [, group] of groups) {
    group.sort(
      (a, b) =>
        (a.data.page || a.filters.page || 1) -
        (b.data.page || b.filters.page || 1),
    );

    const filters = group[0]?.filters;
    const unfiltered = isUnfilteredBookListFilters(filters);

    let totalDelta: number;
    if (unfiltered) {
      const maxTotal = Math.max(
        ...group.map((e) => finiteTotal(e.data)),
        0,
      );
      totalDelta = Math.min(bookIds.length, maxTotal);
    } else {
      const matching = new Set<string>();
      for (const entry of group) {
        for (const book of entry.data.books) {
          if (idSet.has(book.id)) matching.add(book.id);
        }
      }
      for (const snap of snapshots) {
        if (idSet.has(snap.id) && snapshotMatchesBookFilters(snap, filters)) {
          matching.add(snap.id);
        }
      }
      totalDelta = matching.size;
    }

    type MutablePage = {
      queryKey: readonly unknown[];
      filters: BookFilters;
      data: BooksListResponse;
      removedFromPage: number;
    };

    const pages: MutablePage[] = group.map((entry) => {
      const books = entry.data.books.filter((b) => !idSet.has(b.id));
      const removedFromPage = entry.data.books.length - books.length;
      const limit =
        entry.data.limit ||
        entry.filters.limit ||
        Math.max(books.length, 1);
      // Full-universe dumps (limit ≥ 1000): total must equal books.length.
      // Unfiltered thin keys: absolute total from finiteTotal - delta (sync
      // from universe happens after ensureAdminBooksUniverse).
      const preferFullUniverse = isFullUniverseDump(limit, entry.filters.limit);
      const total = preferFullUniverse
        ? books.length
        : Math.max(0, finiteTotal(entry.data) - totalDelta);
      const page = entry.data.page || entry.filters.page || 1;
      const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
      return {
        queryKey: entry.queryKey,
        filters: entry.filters,
        removedFromPage,
        data: {
          ...entry.data,
          books,
          total,
          limit: preferFullUniverse
            ? Math.max(limit, ADMIN_BOOKS_UNFILTERED.limit ?? 1000)
            : limit,
          page,
          totalPages,
        },
      };
    });

    // Backfill holes only when this page actually lost a row (not limit:1 universe seeds).
    for (let i = 0; i < pages.length; i++) {
      const cur = pages[i];
      if (cur.removedFromPage <= 0) continue;

      const { limit, page, total } = cur.data;
      const offset = (page - 1) * limit;
      const expectedOnPage = Math.min(limit, Math.max(0, total - offset));

      while (cur.data.books.length < expectedOnPage) {
        const donorIdx = pages.findIndex(
          (p, j) => j > i && p.data.books.length > 0,
        );
        if (donorIdx === -1) break;
        const donor = pages[donorIdx];
        const need = expectedOnPage - cur.data.books.length;
        const take = donor.data.books.slice(0, need);
        donor.data = {
          ...donor.data,
          books: donor.data.books.slice(take.length),
        };
        cur.data = {
          ...cur.data,
          books: [...cur.data.books, ...take],
        };
      }

      if (cur.data.books.length < expectedOnPage) {
        keysNeedingRefetch.push(cur.queryKey);
      }
    }

    for (const page of pages) {
      queryClient.setQueryData(page.queryKey, page.data);
    }
  }

  for (const key of keysNeedingRefetch) {
    void queryClient.invalidateQueries({ queryKey: key as never });
  }
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

/**
 * Ensure AdminBooksList KPI universe key stays in sync with densify.
 * PrefetchLink used to warm `adminList({})` while KPIs use ADMIN_BOOKS_UNFILTERED
 * — different keys → sidebar badge ahead of Total Books / Catalog (N).
 */
function ensureAdminBooksUniverse(
  queryClient: QueryClient,
  mutator: (
    prev: BooksListResponse | undefined,
  ) => BooksListResponse | undefined,
): void {
  const universeKey = queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED);
  let prev = queryClient.getQueryData<BooksListResponse>(universeKey);

  // Clone densest warm unfiltered page into universe when KPI key was never mounted.
  if (!prev) {
    let best: BooksListResponse | undefined;
    let bestScore = -1;
    for (const [queryKey, page] of queryClient.getQueriesData<BooksListResponse>(
      { queryKey: queryKeys.books.adminRoot },
    )) {
      if (!Array.isArray(queryKey) || !page?.books) continue;
      const filters = (queryKey[1] as BookFilters | undefined) ?? {};
      if (!isUnfilteredBookListFilters(filters)) continue;
      const complete = page.books.length >= page.total ? 1_000_000 : 0;
      const score = complete + page.total * 1_000 + page.books.length;
      if (score > bestScore) {
        best = page;
        bestScore = score;
      }
    }
    if (best) {
      prev = {
        ...best,
        page: 1,
        limit: Math.max(
          ADMIN_BOOKS_UNFILTERED.limit ?? 1000,
          best.limit ?? 0,
          best.books.length,
        ),
      };
    }
  }

  const next = mutator(prev);
  if (next !== undefined && next !== prev) {
    queryClient.setQueryData(universeKey, next);
  }
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

  // Pagination-/sort-aware list densify — pass filters from each warm key.
  for (const [queryKey, old] of queryClient.getQueriesData<BooksListResponse>({
    queryKey: queryKeys.books.adminRoot,
  })) {
    if (!Array.isArray(queryKey)) continue;
    const filters = (queryKey[1] as BookFilters | undefined) ?? {};
    const next = upsertInListResponse(old, book, allowInsert, filters);
    if (next !== undefined && next !== old) {
      queryClient.setQueryData(queryKey, next);
    }
  }

  // KPI / Catalog (N) subscribe to ADMIN_BOOKS_UNFILTERED — always keep it warm.
  ensureAdminBooksUniverse(queryClient, (prev) => {
    const next = upsertInListResponse(
      prev,
      book,
      allowInsert,
      ADMIN_BOOKS_UNFILTERED,
    );
    if (!next?.books) return next;
    const limit = Math.max(
      next.limit ?? 0,
      ADMIN_BOOKS_UNFILTERED.limit ?? 1000,
      next.books.length,
    );
    const coerced = finiteTotal(next);
    // Absolute only when the dump holds every row (incomplete clones keep coerced total).
    const complete = next.books.length >= coerced;
    const total = complete ? next.books.length : coerced;
    return {
      ...next,
      books: next.books,
      total,
      limit,
      page: 1,
      totalPages: Math.max(1, Math.ceil(total / limit) || 1),
    };
  });

  const universe = queryClient.getQueryData<BooksListResponse>(
    queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED),
  );
  if (universe) {
    syncUnfilteredThinTotalsFromUniverse(queryClient);
  }

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
  densifyBookGenres(queryClient);
  patchAdminStatsOnBookChange(queryClient, {
    previous,
    next: toBookSnapshot(book),
  });
  // Borrow Queue / My Profile / Holds — inventory + title DNA after catalog edit.
  const available =
    typeof book.availableCopies === "number" ? book.availableCopies : undefined;
  const total =
    typeof book.totalCopies === "number" ? book.totalCopies : undefined;
  syncBorrowRequestBookFields(queryClient, book.id, {
    ...(available !== undefined ? { availableCopies: available } : {}),
    ...(total !== undefined ? { totalCopies: total } : {}),
    ...(typeof book.title === "string" ? { title: book.title } : {}),
    ...(typeof book.author === "string" ? { author: book.author } : {}),
    ...(book.genre !== undefined
      ? { genre: typeof book.genre === "string" ? book.genre : null }
      : {}),
    ...(typeof book.rating === "number" ? { rating: book.rating } : {}),
    ...(book.coverUrl !== undefined
      ? {
          coverUrl:
            typeof book.coverUrl === "string" ? book.coverUrl : null,
        }
      : {}),
    ...(book.coverColor !== undefined
      ? {
          coverColor:
            typeof book.coverColor === "string" ? book.coverColor : null,
        }
      : {}),
  });
  // Insights charts — evict so soft-nav refetches (no invent series densify).
  evictAnalyticsCaches(queryClient);
}

/**
 * Prepend densified audit row onto Book Catalog detail Activity (FIFO-25).
 * Call after densifyBookWrite alongside densifyActivityLog on book.write.
 * Cold-skip when detail was never opened (create → soft-nav still seeds via write).
 */
export function prependBookAuditEvent(
  queryClient: QueryClient,
  args: {
    bookId: string;
    action: string;
    details?: Record<string, unknown> | null;
    actorId?: string | null;
    actorName?: string | null;
    actorEmail?: string | null;
    actorUniversityCard?: string | null;
  },
): void {
  const key = queryKeys.books.detail(args.bookId);
  const prev = queryClient.getQueryData<BookLike>(key);
  if (!prev) return;

  const actorUniversityCard = resolveBookActorCard(
    prev,
    args.actorId,
    args.actorUniversityCard,
  );

  const event: TicketActivityEvent = {
    id: `densify-book-${args.bookId}-${Date.now()}`,
    kind: "audit",
    at: new Date().toISOString(),
    label: bookAuditLabel(args.action, args.details),
    actorId: args.actorId ?? null,
    actorName: args.actorName ?? null,
    actorEmail: args.actorEmail ?? null,
    actorUniversityCard,
    detail:
      typeof args.details?.title === "string" ? args.details.title : null,
  };

  const existing = prev.auditEvents ?? [];
  queryClient.setQueryData<BookLike>(key, {
    ...prev,
    auditEvents: [event, ...existing].slice(0, BOOK_AUDIT_FIFO),
  });
}

/** Prefer passed card; else reuse sibling audit / catalog stamps for same actorId. */
function resolveBookActorCard(
  prev: BookLike,
  actorId: string | null | undefined,
  passed: string | null | undefined,
): string | null {
  if (passed) return passed;
  if (!actorId) return null;
  for (const e of prev.auditEvents ?? []) {
    if (e.actorId === actorId && e.actorUniversityCard) {
      return e.actorUniversityCard;
    }
  }
  for (const actor of [prev.updatedByActor, prev.createdByActor]) {
    if (actor?.id === actorId && actor.universityCard) {
      return actor.universityCard;
    }
  }
  return null;
}

/** Drop deleted book ids from detail + admin list + featured/related caches. */
export function densifyBookDelete(
  queryClient: QueryClient,
  bookIds: string[],
  /** KPI DNA when RQ detail/list miss (DeleteBookDialog / list row). */
  fallbackSnapshots?: AdminStatsBookSnapshot[],
): void {
  const fallbackById = new Map(
    (fallbackSnapshots ?? [])
      .filter((s) => Boolean(s?.id))
      .map((s) => [s.id, s] as const),
  );
  const snapshots = bookIds
    .map((id) => {
      const cached = findCachedBookSnapshot(queryClient, id);
      const fb = fallbackById.get(id);
      if (!cached && !fb) return null;
      if (!cached) return fb ?? null;
      if (!fb) return cached;
      // Cache wins defined fields; dialog DNA fills thin list-row holes.
      return {
        id: cached.id,
        isActive: cached.isActive ?? fb.isActive,
        totalCopies: cached.totalCopies ?? fb.totalCopies,
        availableCopies: cached.availableCopies ?? fb.availableCopies,
        isbn: cached.isbn ?? fb.isbn,
        publisher: cached.publisher ?? fb.publisher,
        pageCount: cached.pageCount ?? fb.pageCount,
        title: cached.title ?? fb.title,
        author: cached.author ?? fb.author,
        rating: cached.rating ?? fb.rating,
        coverUrl: cached.coverUrl ?? fb.coverUrl,
        coverColor: cached.coverColor ?? fb.coverColor,
        genre: cached.genre ?? fb.genre,
        publicationYear: cached.publicationYear ?? fb.publicationYear,
        language: cached.language ?? fb.language,
      };
    })
    .filter((b): b is AdminStatsBookSnapshot => Boolean(b));

  for (const id of bookIds) {
    // Inactive only — removing an active detail observer mid-page causes 404 flash.
    queryClient.removeQueries({
      queryKey: queryKeys.books.detail(id),
      type: "inactive",
    });
  }
  const idSet = new Set(bookIds);

  densifyBookListDeletes(queryClient, bookIds, snapshots);

  // Absolute reconcile on KPI universe — never re-apply totalDelta on top of
  // densifyBookListDeletes (that produced badge 16 while list still had 17).
  ensureAdminBooksUniverse(queryClient, (prev) => {
    if (!prev?.books) return prev;
    const nextBooks = prev.books.filter((b) => !idSet.has(b.id));
    const removed = prev.books.length - nextBooks.length;
    const limit = Math.max(
      prev.limit ?? 0,
      ADMIN_BOOKS_UNFILTERED.limit ?? 1000,
      nextBooks.length,
    );
    const wasComplete = prev.books.length >= finiteTotal(prev);
    // Only subtract rows actually removed from this dump (no double-decrement).
    const total = wasComplete
      ? nextBooks.length
      : Math.max(0, finiteTotal(prev) - removed);
    return {
      ...prev,
      books: nextBooks,
      total,
      limit,
      page: 1,
      totalPages: Math.max(1, Math.ceil(total / limit) || 1),
    };
  });

  syncUnfilteredThinTotalsFromUniverse(queryClient);

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
  densifyBookGenres(queryClient);
  for (const snap of snapshots) {
    patchAdminStatsOnBookDelete(queryClient, snap);
  }
  evictAnalyticsCaches(queryClient);
}
