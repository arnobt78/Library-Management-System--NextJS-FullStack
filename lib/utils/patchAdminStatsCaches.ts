/**
 * Densify queryKeys.admin.stats after borrow / user / book / ticket / review /
 * admin-request mutations. Patches KPI counters + recent lists in place so
 * overview does not flash thin/unenriched rows between invalidate and refetch.
 * Never invents reviewer as "an admin".
 * Parent: REQ-0033 Wave B — admin stats densify
 *
 * Overview coverage map (Library Overview StatCards + mid-cards):
 * - Total Users badges → patchAdminStatsOnUserStatusChange + pending queue absolute sync
 * - Total Books / Availability / Book Information → patchAdminStatsOnBook*
 * - Active Borrows badges → patchAdminStatsOnBorrow* + universe recount (+ claim create)
 * - Admins value → patchAdminStatsOnUserRoleChange; request badges → admin-request
 * - Open Tickets badges → patchAdminStatsOnTicketStatusChange
 * - Pending Reviews badges → patchAdminStatsOnReviewStatusChange
 * - User Status mid-card echoes user + pendingAdminRequests densify
 * - Signup create (other session) → invalidate/refetch only (no same-tab densify)
 *
 * Important: borrow mutations optimistically rewrite list status before
 * commitMutationCache snapshots baselines. Always pass explicit `fromStatus`
 * (pre-mutate) — do not infer solely from post-optimistic baselines or KPI
 * badge deltas become no-ops (Active/Returned/Cancelled drift until refresh).
 */

import type { QueryClient } from "@tanstack/react-query";
import type {
  AdminDashboardCategoryStat,
  AdminDashboardInactiveTitle,
  AdminDashboardStats,
  AdminDashboardTopRatedBook,
  OverviewRecentBorrow,
  OverviewRecentUser,
} from "@/lib/admin/adminDashboardStatsTypes";
import { isBookActive } from "@/lib/admin/lendableBookCopies";
import { queryKeys } from "@/lib/query/keys";

const RECENT_CAP = 5;
const LIST_CAP = 5;

type BorrowStatus = "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED" | string;
type AccountStatus = "PENDING" | "APPROVED" | "REJECTED" | string;
type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | string;
type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | string;

/** Numeric overview KPI fields (includes optional densify-only counters). */
type AdminStatsNumericField =
  | "totalUsers"
  | "approvedUsers"
  | "pendingUsers"
  | "rejectedUsers"
  | "adminUsers"
  | "totalBooks"
  | "totalCopies"
  | "availableCopies"
  | "borrowedCopies"
  | "activeBooks"
  | "inactiveBooks"
  | "booksWithISBN"
  | "booksWithPublisher"
  | "averagePageCount"
  | "activeBorrows"
  | "pendingBorrows"
  | "returnedBooks"
  | "cancelledBorrows"
  | "reservationsWaiting"
  | "openTicketCount"
  | "pendingReviewCount"
  | "pendingAdminRequests"
  | "rejectedAdminRequests"
  | "approvedAdminRequests"
  | "ticketsOpen"
  | "ticketsInProgress"
  | "ticketsResolved"
  | "ticketsUrgentOpen"
  | "reviewsApproved"
  | "reviewsRejected";

function bumpStatusCount(
  stats: AdminDashboardStats,
  field: AdminStatsNumericField,
  delta: number,
): void {
  const current = (stats[field] as number | undefined) ?? 0;
  (stats as unknown as Record<string, number>)[field] = Math.max(
    0,
    current + delta,
  );
}

function borrowStatusField(
  status: BorrowStatus,
):
  | "activeBorrows"
  | "pendingBorrows"
  | "returnedBooks"
  | "cancelledBorrows"
  | null {
  if (status === "BORROWED") return "activeBorrows";
  if (status === "PENDING") return "pendingBorrows";
  if (status === "RETURNED") return "returnedBooks";
  if (status === "CANCELLED") return "cancelledBorrows";
  return null;
}

function accountStatusField(
  status: AccountStatus,
): "approvedUsers" | "pendingUsers" | "rejectedUsers" | null {
  if (status === "APPROVED") return "approvedUsers";
  if (status === "PENDING") return "pendingUsers";
  if (status === "REJECTED") return "rejectedUsers";
  return null;
}

function readAdminStats(
  queryClient: QueryClient,
): AdminDashboardStats | undefined {
  const data = queryClient.getQueryData<AdminDashboardStats>(
    queryKeys.admin.stats,
  );
  if (!data || typeof data !== "object") return undefined;
  if (!Array.isArray(data.recentBorrows) || !Array.isArray(data.recentUsers)) {
    return undefined;
  }
  return data;
}

function writeAdminStats(
  queryClient: QueryClient,
  next: AdminDashboardStats,
): void {
  queryClient.setQueryData(queryKeys.admin.stats, next);
}

/**
 * Apply BORROWED enter/leave to lendable catalog copy KPIs.
 * Skip when the title is inactive — inactive inventory is outside the pool.
 */
function applyBorrowCopyDeltas(
  stats: AdminDashboardStats,
  fromStatus: BorrowStatus | null | undefined,
  toStatus: BorrowStatus,
  bookIsActive: boolean,
): void {
  if (!bookIsActive) return;
  const leftBorrowed = fromStatus === "BORROWED" && toStatus !== "BORROWED";
  const enteredBorrowed = fromStatus !== "BORROWED" && toStatus === "BORROWED";
  if (leftBorrowed) {
    bumpStatusCount(stats, "borrowedCopies", -1);
    bumpStatusCount(stats, "availableCopies", 1);
  }
  if (enteredBorrowed) {
    bumpStatusCount(stats, "borrowedCopies", 1);
    bumpStatusCount(stats, "availableCopies", -1);
  }
}

/**
 * Absolute recount of Active Borrows badge fields from densified borrow-requests
 * universe (unfiltered admin list). Prefer over deltas when the full queue is cached.
 */
export function syncAdminStatsBorrowCountsFromRows(
  queryClient: QueryClient,
  rows: Array<{ status: string }> | null | undefined,
): void {
  if (!Array.isArray(rows)) return;
  const prev = readAdminStats(queryClient);
  if (!prev) return;

  let pendingBorrows = 0;
  let activeBorrows = 0;
  let returnedBooks = 0;
  let cancelledBorrows = 0;
  for (const row of rows) {
    if (row.status === "PENDING") pendingBorrows += 1;
    else if (row.status === "BORROWED") activeBorrows += 1;
    else if (row.status === "RETURNED") returnedBooks += 1;
    else if (row.status === "CANCELLED") cancelledBorrows += 1;
  }

  writeAdminStats(queryClient, {
    ...prev,
    pendingBorrows,
    activeBorrows,
    returnedBooks,
    cancelledBorrows,
  });
}

/**
 * After borrow approve / reject / return / create — adjust KPI + recent borrows.
 * Safe no-op when admin.stats is not cached.
 * Pass `fromStatus` from pre-mutate meta when lists were already optimistically patched.
 */
export function patchAdminStatsOnBorrowStatusChange(
  queryClient: QueryClient,
  args: {
    recordId: string;
    fromStatus?: BorrowStatus | null;
    toStatus: BorrowStatus;
    /** Prefer enriched row when available (create / list densify). */
    recentRow?: OverviewRecentBorrow | null;
    /**
     * Lendable Available/Borrowed only move when the title is active.
     * Default true when unknown (preserve prior densify for active catalog).
     */
    bookIsActive?: boolean;
  },
): void {
  const prev = readAdminStats(queryClient);
  if (!prev) return;

  const next: AdminDashboardStats = {
    ...prev,
    recentBorrows: [...prev.recentBorrows],
  };

  // Prefer caller-supplied pre-mutate status; fall back to overview recent row.
  const fromStatus =
    args.fromStatus !== undefined
      ? args.fromStatus
      : (next.recentBorrows.find((r) => r.id === args.recordId)?.status ??
        null);
  const toField = borrowStatusField(args.toStatus);
  const fromField = fromStatus ? borrowStatusField(fromStatus) : null;
  if (fromField && fromField !== toField) bumpStatusCount(next, fromField, -1);
  if (toField && toField !== fromField) bumpStatusCount(next, toField, 1);
  applyBorrowCopyDeltas(
    next,
    fromStatus,
    args.toStatus,
    args.bookIsActive !== false,
  );

  const idx = next.recentBorrows.findIndex((r) => r.id === args.recordId);
  if (idx >= 0) {
    const existing = next.recentBorrows[idx];
    next.recentBorrows[idx] = {
      ...existing,
      ...(args.recentRow ?? {}),
      status: args.toStatus,
      id: args.recordId,
    };
  } else if (args.recentRow) {
    next.recentBorrows = [
      { ...args.recentRow, status: args.toStatus },
      ...next.recentBorrows,
    ].slice(0, RECENT_CAP);
  }

  writeAdminStats(queryClient, next);
}

/**
 * After signup approve / reject / re-pending — adjust user KPIs + recent users.
 * Pass reviewer only when known from session/SSR actor (never invent).
 */
export function patchAdminStatsOnUserStatusChange(
  queryClient: QueryClient,
  args: {
    userId: string;
    fromStatus?: AccountStatus | null;
    toStatus: AccountStatus;
    recentRow?: OverviewRecentUser | null;
    reviewer?: OverviewRecentUser["reviewer"];
    statusReviewedAt?: string | null;
  },
): void {
  const prev = readAdminStats(queryClient);
  if (!prev) return;

  const next: AdminDashboardStats = {
    ...prev,
    recentUsers: [...prev.recentUsers],
  };

  const fromField = args.fromStatus
    ? accountStatusField(args.fromStatus)
    : null;
  const toField = accountStatusField(args.toStatus);
  if (fromField && fromField !== toField) bumpStatusCount(next, fromField, -1);
  if (toField && toField !== fromField) bumpStatusCount(next, toField, 1);

  const idx = next.recentUsers.findIndex((u) => u.id === args.userId);
  if (idx >= 0) {
    const existing = next.recentUsers[idx];
    next.recentUsers[idx] = {
      ...existing,
      ...(args.recentRow ?? {}),
      status: args.toStatus,
      id: args.userId,
      ...(args.reviewer !== undefined ? { reviewer: args.reviewer } : {}),
      ...(args.statusReviewedAt !== undefined
        ? { statusReviewedAt: args.statusReviewedAt }
        : {}),
    };
  } else if (args.recentRow) {
    next.recentUsers = [
      {
        ...args.recentRow,
        status: args.toStatus,
        ...(args.reviewer !== undefined ? { reviewer: args.reviewer } : {}),
        ...(args.statusReviewedAt !== undefined
          ? { statusReviewedAt: args.statusReviewedAt }
          : {}),
      },
      ...next.recentUsers,
    ].slice(0, RECENT_CAP);
  }

  writeAdminStats(queryClient, next);
}

/** Sync Admins card badges after make-admin queue densify. */
export function patchAdminStatsOnAdminRequestStatusChange(
  queryClient: QueryClient,
  args: {
    fromStatus?: AccountStatus | null;
    /** `null` = withdrawn/cancelled with no settled status (pending −1 only). */
    toStatus: AccountStatus | null;
  },
): void {
  const prev = readAdminStats(queryClient);
  if (!prev) return;
  const next: AdminDashboardStats = { ...prev };

  const map = (
    status: AccountStatus | null | undefined,
  ):
    | "pendingAdminRequests"
    | "rejectedAdminRequests"
    | "approvedAdminRequests"
    | null => {
    if (status === "PENDING") return "pendingAdminRequests";
    if (status === "REJECTED") return "rejectedAdminRequests";
    if (status === "APPROVED") return "approvedAdminRequests";
    return null;
  };

  const fromField = map(args.fromStatus);
  const toField = map(args.toStatus);
  if (fromField && fromField !== toField) bumpStatusCount(next, fromField, -1);
  if (toField && toField !== fromField) bumpStatusCount(next, toField, 1);
  writeAdminStats(queryClient, next);
}

/** Sync Pending Reviews card badges after review moderate densify. */
export function patchAdminStatsOnReviewStatusChange(
  queryClient: QueryClient,
  args: {
    fromStatus?: ReviewStatus | null;
    toStatus: ReviewStatus | null;
  },
): void {
  const prev = readAdminStats(queryClient);
  if (!prev) return;
  const next: AdminDashboardStats = { ...prev };

  const map = (
    status: ReviewStatus | null | undefined,
  ): "pendingReviewCount" | "reviewsApproved" | "reviewsRejected" | null => {
    if (status === "PENDING") return "pendingReviewCount";
    if (status === "APPROVED") return "reviewsApproved";
    if (status === "REJECTED") return "reviewsRejected";
    return null;
  };

  const fromField = map(args.fromStatus);
  const toField = map(args.toStatus);
  if (fromField && fromField !== toField) bumpStatusCount(next, fromField, -1);
  if (toField && toField !== fromField) bumpStatusCount(next, toField, 1);
  writeAdminStats(queryClient, next);
}

/**
 * Sync Open Tickets KPI + badges after ticket status densify.
 * `openTicketCount` stays OPEN+IN_PROGRESS (nav parity).
 * `toStatus: null` = delete (drop from status/open/urgent counts).
 */
export function patchAdminStatsOnTicketStatusChange(
  queryClient: QueryClient,
  args: {
    fromStatus?: TicketStatus | null;
    toStatus: TicketStatus | null;
    fromPriority?: string | null;
    toPriority?: string | null;
  },
): void {
  const prev = readAdminStats(queryClient);
  if (!prev) return;
  const next: AdminDashboardStats = { ...prev };

  const statusField = (
    status: TicketStatus | null | undefined,
  ):
    | "ticketsOpen"
    | "ticketsInProgress"
    | "ticketsResolved"
    | null => {
    if (status === "OPEN") return "ticketsOpen";
    if (status === "IN_PROGRESS") return "ticketsInProgress";
    if (status === "RESOLVED") return "ticketsResolved";
    return null;
  };

  const isOpenish = (status: TicketStatus | null | undefined) =>
    status === "OPEN" || status === "IN_PROGRESS";

  const fromField = statusField(args.fromStatus);
  const toField = statusField(args.toStatus);
  if (fromField && fromField !== toField) bumpStatusCount(next, fromField, -1);
  if (toField && toField !== fromField) bumpStatusCount(next, toField, 1);

  if (isOpenish(args.fromStatus) && !isOpenish(args.toStatus)) {
    bumpStatusCount(next, "openTicketCount", -1);
  } else if (!isOpenish(args.fromStatus) && isOpenish(args.toStatus)) {
    bumpStatusCount(next, "openTicketCount", 1);
  }

  const fromUrgent =
    args.fromPriority === "URGENT" && isOpenish(args.fromStatus);
  const toUrgent = args.toPriority === "URGENT" && isOpenish(args.toStatus);
  if (fromUrgent && !toUrgent) bumpStatusCount(next, "ticketsUrgentOpen", -1);
  if (!fromUrgent && toUrgent) bumpStatusCount(next, "ticketsUrgentOpen", 1);

  writeAdminStats(queryClient, next);
}

/** Promote/demote — Admins KPI value (`adminUsers`). */
export function patchAdminStatsOnUserRoleChange(
  queryClient: QueryClient,
  args: {
    fromRole?: string | null;
    toRole: string;
  },
): void {
  const prev = readAdminStats(queryClient);
  if (!prev) return;
  const next: AdminDashboardStats = { ...prev };
  const wasAdmin = args.fromRole === "ADMIN";
  const isAdmin = args.toRole === "ADMIN";
  if (wasAdmin && !isAdmin) bumpStatusCount(next, "adminUsers", -1);
  if (!wasAdmin && isAdmin) bumpStatusCount(next, "adminUsers", 1);
  writeAdminStats(queryClient, next);
}

/** Snapshot fields needed to densify KPIs + Overview mid-panel lists. */
export type AdminStatsBookSnapshot = {
  id: string;
  isActive?: boolean | null;
  totalCopies?: number | null;
  availableCopies?: number | null;
  isbn?: string | null;
  publisher?: string | null;
  pageCount?: number | null;
  title?: string | null;
  author?: string | null;
  rating?: number | null;
  coverUrl?: string | null;
  coverColor?: string | null;
  genre?: string | null;
  publicationYear?: number | string | null;
  language?: string | null;
};

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && String(value).trim());
}

function strOr(value: string | null | undefined, fallback: string): string {
  return hasText(value) ? String(value).trim() : fallback;
}

/** Borrowed physical copies for one title (clamped). */
function borrowedOf(book: AdminStatsBookSnapshot): number {
  return Math.max(0, num(book.totalCopies) - num(book.availableCopies));
}

/** Add one title’s inventory into the lendable overview pool. */
function addLendableCopies(
  stats: AdminDashboardStats,
  book: AdminStatsBookSnapshot,
): void {
  bumpStatusCount(stats, "totalCopies", num(book.totalCopies));
  bumpStatusCount(stats, "availableCopies", num(book.availableCopies));
  bumpStatusCount(stats, "borrowedCopies", borrowedOf(book));
}

/** Remove one title’s inventory from the lendable overview pool. */
function removeLendableCopies(
  stats: AdminDashboardStats,
  book: AdminStatsBookSnapshot,
): void {
  bumpStatusCount(stats, "totalCopies", -num(book.totalCopies));
  bumpStatusCount(stats, "availableCopies", -num(book.availableCopies));
  bumpStatusCount(stats, "borrowedCopies", -borrowedOf(book));
}

function adjustAveragePageCount(
  stats: AdminDashboardStats,
  pageCountDelta: number,
  bookCountDelta: number,
): void {
  const prevTotal = stats.totalBooks;
  const prevAvg = stats.averagePageCount;
  const prevSum = prevAvg * prevTotal;
  const nextTotal = Math.max(0, prevTotal + bookCountDelta);
  if (nextTotal === 0) {
    stats.averagePageCount = 0;
    return;
  }
  stats.averagePageCount = Math.max(0, (prevSum + pageCountDelta) / nextTotal);
}

function yearKey(book: AdminStatsBookSnapshot): string {
  const y = book.publicationYear;
  if (y === null || y === undefined || y === "") return "Unknown";
  return String(y);
}

function languageKey(book: AdminStatsBookSnapshot): string {
  return strOr(book.language, "Unknown");
}

function genreKey(book: AdminStatsBookSnapshot): string {
  return strOr(book.genre, "Unknown");
}

function toInactiveRow(
  book: AdminStatsBookSnapshot,
): AdminDashboardInactiveTitle | null {
  if (!hasText(book.title)) return null;
  return {
    id: book.id,
    title: String(book.title),
    author: strOr(book.author, "Unknown"),
    coverUrl: book.coverUrl ?? null,
    coverColor: book.coverColor ?? null,
    genre: book.genre ?? null,
    rating: num(book.rating),
    totalCopies: num(book.totalCopies),
    availableCopies: num(book.availableCopies),
  };
}

function toTopRatedRow(
  book: AdminStatsBookSnapshot,
): AdminDashboardTopRatedBook | null {
  const rating = num(book.rating);
  if (!hasText(book.title) || rating <= 0) return null;
  return {
    id: book.id,
    title: String(book.title),
    author: strOr(book.author, "Unknown"),
    rating,
    coverUrl: book.coverUrl ?? null,
    coverColor: book.coverColor ?? null,
    genre: book.genre ?? null,
  };
}

function upsertInactiveTitles(
  list: AdminDashboardInactiveTitle[],
  book: AdminStatsBookSnapshot,
): AdminDashboardInactiveTitle[] {
  const row = toInactiveRow(book);
  if (!row) return list.filter((b) => b.id !== book.id);
  const without = list.filter((b) => b.id !== book.id);
  return [...without, row]
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, LIST_CAP);
}

function removeInactiveTitle(
  list: AdminDashboardInactiveTitle[],
  bookId: string,
): AdminDashboardInactiveTitle[] {
  return list.filter((b) => b.id !== bookId);
}

function upsertTopRated(
  list: AdminDashboardTopRatedBook[],
  book: AdminStatsBookSnapshot,
): AdminDashboardTopRatedBook[] {
  const without = list.filter((b) => b.id !== book.id);
  const row = toTopRatedRow(book);
  if (!row) return without;
  return [...without, row]
    .sort((a, b) => {
      const byRating = b.rating - a.rating;
      if (byRating !== 0) return byRating;
      return a.title.localeCompare(b.title);
    })
    .slice(0, LIST_CAP);
}

function removeTopRated(
  list: AdminDashboardTopRatedBook[],
  bookId: string,
): AdminDashboardTopRatedBook[] {
  return list.filter((b) => b.id !== bookId);
}

function bumpPairList(
  pairs: Array<[string, number]>,
  key: string,
  delta: number,
): Array<[string, number]> {
  const map = new Map(pairs);
  const next = (map.get(key) ?? 0) + delta;
  if (next <= 0) map.delete(key);
  else map.set(key, next);
  return [...map.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, LIST_CAP) as Array<[string, number]>;
}

/** Adjust category title count + lendable copies for one active contribution. */
function applyCategoryDelta(
  stats: AdminDashboardStats,
  book: AdminStatsBookSnapshot,
  sign: 1 | -1,
  includeCopies: boolean,
): void {
  const genre = genreKey(book);
  const list = [...(stats.categoryStats ?? [])];
  const idx = list.findIndex((c) => c.genre === genre);
  const copiesTotal = includeCopies ? num(book.totalCopies) * sign : 0;
  const copiesAvail = includeCopies ? num(book.availableCopies) * sign : 0;
  const rating = num(book.rating);

  if (idx < 0) {
    if (sign < 0) return;
    const created: AdminDashboardCategoryStat = {
      genre,
      count: 1,
      totalCopies: Math.max(0, copiesTotal),
      availableCopies: Math.max(0, copiesAvail),
      avgRating: rating > 0 ? rating : 0,
      totalRating: rating > 0 ? rating : 0,
      ratingCount: rating > 0 ? 1 : 0,
    };
    stats.categoryStats = [...list, created].sort((a, b) => b.count - a.count);
    return;
  }

  const cur = { ...list[idx] };
  cur.count = Math.max(0, cur.count + sign);
  cur.totalCopies = Math.max(0, cur.totalCopies + copiesTotal);
  cur.availableCopies = Math.max(0, cur.availableCopies + copiesAvail);
  if (rating > 0) {
    cur.totalRating = Math.max(0, cur.totalRating + rating * sign);
    cur.ratingCount = Math.max(0, cur.ratingCount + sign);
    cur.avgRating =
      cur.ratingCount > 0 ? cur.totalRating / cur.ratingCount : 0;
  }
  if (cur.count === 0) {
    list.splice(idx, 1);
  } else {
    list[idx] = cur;
  }
  stats.categoryStats = list.sort((a, b) => b.count - a.count);
}

/**
 * Densify Overview mid-panel lists (Inactive / Top Rated / Categories / Year / Language).
 * Health bars reuse densified counters — no separate list patch.
 */
function densifyCatalogMidPanels(
  stats: AdminDashboardStats,
  before: AdminStatsBookSnapshot | null | undefined,
  after: AdminStatsBookSnapshot | null,
): void {
  stats.inactiveTitles = [...(stats.inactiveTitles ?? [])];
  stats.topRatedBooks = [...(stats.topRatedBooks ?? [])];
  stats.booksByYear = [...(stats.booksByYear ?? [])];
  stats.booksByLanguage = [...(stats.booksByLanguage ?? [])];
  stats.categoryStats = [...(stats.categoryStats ?? [])];

  if (!before && after) {
    // Create
    stats.booksByYear = bumpPairList(stats.booksByYear, yearKey(after), 1);
    stats.booksByLanguage = bumpPairList(
      stats.booksByLanguage,
      languageKey(after),
      1,
    );
    applyCategoryDelta(stats, after, 1, isBookActive(after));
    if (!isBookActive(after)) {
      stats.inactiveTitles = upsertInactiveTitles(stats.inactiveTitles, after);
    }
    stats.topRatedBooks = upsertTopRated(stats.topRatedBooks, after);
    return;
  }

  if (before && !after) {
    // Delete
    stats.booksByYear = bumpPairList(stats.booksByYear, yearKey(before), -1);
    stats.booksByLanguage = bumpPairList(
      stats.booksByLanguage,
      languageKey(before),
      -1,
    );
    applyCategoryDelta(stats, before, -1, isBookActive(before));
    stats.inactiveTitles = removeInactiveTitle(stats.inactiveTitles, before.id);
    stats.topRatedBooks = removeTopRated(stats.topRatedBooks, before.id);
    return;
  }

  if (!before || !after) return;

  const wasActive = isBookActive(before);
  const nowActive = isBookActive(after);

  // Year / language: move buckets when keys change
  const yBefore = yearKey(before);
  const yAfter = yearKey(after);
  if (yBefore !== yAfter) {
    stats.booksByYear = bumpPairList(stats.booksByYear, yBefore, -1);
    stats.booksByYear = bumpPairList(stats.booksByYear, yAfter, 1);
  }
  const lBefore = languageKey(before);
  const lAfter = languageKey(after);
  if (lBefore !== lAfter) {
    stats.booksByLanguage = bumpPairList(stats.booksByLanguage, lBefore, -1);
    stats.booksByLanguage = bumpPairList(stats.booksByLanguage, lAfter, 1);
  }

  // Categories: remove old contribution, add new
  applyCategoryDelta(stats, before, -1, wasActive);
  applyCategoryDelta(stats, after, 1, nowActive);

  // Inactive titles list
  if (!nowActive) {
    stats.inactiveTitles = upsertInactiveTitles(stats.inactiveTitles, after);
  } else {
    stats.inactiveTitles = removeInactiveTitle(stats.inactiveTitles, after.id);
  }

  // Top rated — active or inactive titles with rating still show (SSR includes all)
  stats.topRatedBooks = upsertTopRated(stats.topRatedBooks, after);
}

/**
 * Catalog create/update densify for overview Total Books + Availability + mid panels.
 * Lendable copy KPIs only include active titles (null isActive = active).
 * Pass `previous: null` for create.
 */
export function patchAdminStatsOnBookChange(
  queryClient: QueryClient,
  args: {
    previous: AdminStatsBookSnapshot | null | undefined;
    next: AdminStatsBookSnapshot;
  },
): void {
  const prev = readAdminStats(queryClient);
  if (!prev) return;
  const nextStats: AdminDashboardStats = { ...prev };
  const before = args.previous;
  const after = args.next;

  if (!before) {
    bumpStatusCount(nextStats, "totalBooks", 1);
    if (isBookActive(after)) addLendableCopies(nextStats, after);
    if (isBookActive(after)) bumpStatusCount(nextStats, "activeBooks", 1);
    else bumpStatusCount(nextStats, "inactiveBooks", 1);
    if (hasText(after.isbn)) bumpStatusCount(nextStats, "booksWithISBN", 1);
    if (hasText(after.publisher)) {
      bumpStatusCount(nextStats, "booksWithPublisher", 1);
    }
    adjustAveragePageCount(nextStats, num(after.pageCount), 1);
    densifyCatalogMidPanels(nextStats, null, after);
    writeAdminStats(queryClient, nextStats);
    return;
  }

  const wasActive = isBookActive(before);
  const nowActive = isBookActive(after);
  if (wasActive && !nowActive) {
    bumpStatusCount(nextStats, "activeBooks", -1);
    bumpStatusCount(nextStats, "inactiveBooks", 1);
  } else if (!wasActive && nowActive) {
    bumpStatusCount(nextStats, "activeBooks", 1);
    bumpStatusCount(nextStats, "inactiveBooks", -1);
  }

  // Rebuild lendable pool contribution: drop previous active row, add next if active.
  if (wasActive) removeLendableCopies(nextStats, before);
  if (nowActive) addLendableCopies(nextStats, after);

  const hadIsbn = hasText(before.isbn);
  const hasIsbn = hasText(after.isbn);
  if (hadIsbn && !hasIsbn) bumpStatusCount(nextStats, "booksWithISBN", -1);
  if (!hadIsbn && hasIsbn) bumpStatusCount(nextStats, "booksWithISBN", 1);

  const hadPublisher = hasText(before.publisher);
  const hasPublisher = hasText(after.publisher);
  if (hadPublisher && !hasPublisher) {
    bumpStatusCount(nextStats, "booksWithPublisher", -1);
  }
  if (!hadPublisher && hasPublisher) {
    bumpStatusCount(nextStats, "booksWithPublisher", 1);
  }

  const pageDelta = num(after.pageCount) - num(before.pageCount);
  if (pageDelta !== 0) adjustAveragePageCount(nextStats, pageDelta, 0);

  densifyCatalogMidPanels(nextStats, before, after);
  writeAdminStats(queryClient, nextStats);
}

/** Catalog delete densify for overview book KPIs + mid panels. */
export function patchAdminStatsOnBookDelete(
  queryClient: QueryClient,
  book: AdminStatsBookSnapshot,
): void {
  const prev = readAdminStats(queryClient);
  if (!prev) return;
  const next: AdminDashboardStats = { ...prev };

  bumpStatusCount(next, "totalBooks", -1);
  if (isBookActive(book)) removeLendableCopies(next, book);
  if (isBookActive(book)) bumpStatusCount(next, "activeBooks", -1);
  else bumpStatusCount(next, "inactiveBooks", -1);
  if (hasText(book.isbn)) bumpStatusCount(next, "booksWithISBN", -1);
  if (hasText(book.publisher)) bumpStatusCount(next, "booksWithPublisher", -1);
  adjustAveragePageCount(next, -num(book.pageCount), -1);
  densifyCatalogMidPanels(next, book, null);

  writeAdminStats(queryClient, next);
}

/** Library Health — reservations waiting bar on overview. */
export function patchAdminStatsOnReservationWaitingChange(
  queryClient: QueryClient,
  delta: number,
): void {
  if (delta === 0) return;
  const prev = readAdminStats(queryClient);
  if (!prev) return;
  const next: AdminDashboardStats = { ...prev };
  bumpStatusCount(next, "reservationsWaiting", delta);
  writeAdminStats(queryClient, next);
}
