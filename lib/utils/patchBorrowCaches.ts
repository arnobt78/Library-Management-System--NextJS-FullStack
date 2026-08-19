/**
 * Instant densify for borrow list / book inventory caches.
 *
 * Call AFTER `await invalidateMutation("borrow.lifecycle")`, but always pass
 * `baselines` snapped BEFORE invalidate. Invalidate marks inactive lists stale
 * (no wipe); still pass baselines so densify can re-seed when cache is thin.
 *
 * Parent: densify audit map — Wave A (`borrow.lifecycle`)
 */

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type {
  BorrowRecordFull,
  BorrowRecordWithDetails,
  BorrowStatus,
} from "@/lib/services/borrows";
import type { BookBorrowStats } from "@/lib/services/books";
import { patchAdminListAvailability } from "@/lib/utils/patchBookCaches";
import { patchAdminNavCounts } from "@/lib/utils/patchAdminNavCounts";
import {
  patchAdminStatsOnBorrowStatusChange,
  syncAdminStatsBorrowCountsFromRows,
} from "@/lib/utils/patchAdminStatsCaches";
import { evictAnalyticsCaches } from "@/lib/utils/evictAnalyticsCaches";
import {
  densifyUserFineMetrics,
  densifyUserFineMetricsForBorrow,
} from "@/lib/fines/userFineMetrics";
import { isBookActive } from "@/lib/admin/lendableBookCopies";
import {
  clearDensifiedEmpty,
  markDensifiedEmpty,
  writeMappedList,
} from "@/lib/utils/queryCacheLists";
import { syncBorrowRequestBookFields } from "@/lib/utils/syncBorrowRequestBookFields";

export {
  getCachedBookWaitingHolds,
  syncBorrowRequestBookFields,
} from "@/lib/utils/syncBorrowRequestBookFields";

/**
 * Resolve title active flag for overview lendable copy deltas.
 * Prefer detail cache, then admin list row; default active when unknown.
 */
function resolveBookIsActiveForStats(
  queryClient: QueryClient,
  bookId: string | null | undefined,
): boolean {
  if (!bookId) return true;
  const detail = queryClient.getQueryData<{ isActive?: boolean | null }>(
    queryKeys.books.detail(bookId),
  );
  if (detail && "isActive" in detail) return isBookActive(detail);

  const adminLists = queryClient.getQueriesData<{
    books?: Array<{ id: string; isActive?: boolean | null }>;
  }>({ queryKey: queryKeys.books.adminRoot });
  for (const [, data] of adminLists) {
    const row = data?.books?.find((b) => b.id === bookId);
    if (row) return isBookActive(row);
  }
  return true;
}

export type BorrowListBaselines = {
  /** userId → densest cached user-borrows list */
  users: Record<string, BorrowRecordFull[]>;
  /** Densest cached admin borrow-requests list (any filter). */
  requests: BorrowRecordWithDetails[] | undefined;
};

/** Sync Borrow Queue pill from cached PENDING requests list when present. */
function syncPendingBorrowsNav(queryClient: QueryClient): void {
  const pendingKey = queryKeys.borrows.requests({
    status: "PENDING",
    search: undefined,
  });
  const pendingRows =
    queryClient.getQueryData<BorrowRecordWithDetails[]>(pendingKey);
  if (Array.isArray(pendingRows)) {
    patchAdminNavCounts(queryClient, { pendingBorrows: pendingRows.length });
    return;
  }

  // Fallback: densest unfiltered/admin list → count PENDING rows.
  let found = false;
  let densest = 0;
  for (const [, rows] of queryClient.getQueriesData<
    BorrowRecordWithDetails[]
  >({ queryKey: queryKeys.borrows.requestsRoot })) {
    if (!Array.isArray(rows)) continue;
    found = true;
    densest = Math.max(
      densest,
      rows.filter((r) => r.status === "PENDING").length,
    );
  }
  if (found) {
    patchAdminNavCounts(queryClient, { pendingBorrows: densest });
  }
}

export type BookInventoryBaselines = {
  /** bookId → availableCopies from book detail cache */
  availableCopies: Record<string, number>;
  /** bookId → borrow stats snapshot */
  stats: Record<string, BookBorrowStats>;
};

export type BorrowCacheBaselines = BorrowListBaselines & {
  inventory: BookInventoryBaselines;
};

type BorrowRowPatch = {
  status?: BorrowStatus;
  dueDate?: string | null;
  returnDate?: string | null;
  approvedAt?: string | Date | null;
  cancelledAt?: string | Date | null;
  renewedAt?: string | Date | null;
  fineAmount?: string | null;
  displayFineAmount?: string | null;
  fineStatus?: string | null;
  borrowedBy?: string | null;
  returnedBy?: string | null;
  borrowDate?: Date | string | null;
  updatedAt?: Date | string | null;
  updatedBy?: string | null;
  renewalCount?: number;
  approvedByActor?: BorrowRecordWithDetails["approvedByActor"];
  returnedByActor?: BorrowRecordWithDetails["returnedByActor"];
  /** Soft-cancel densify (admin reject / owner cancel). */
  cancelledByActor?: BorrowRecordWithDetails["cancelledByActor"];
};

/** Upsert densified Borrow Queue detail after lifecycle / create. */
function upsertBorrowRequestDetail(
  queryClient: QueryClient,
  recordId: string,
  patch: BorrowRowPatch,
  seed?: BorrowRecordWithDetails | null,
): void {
  const key = queryKeys.borrows.requestDetail(recordId);
  const existing =
    queryClient.getQueryData<BorrowRecordWithDetails>(key) ??
    seed ??
    findCachedRequestRow(queryClient, recordId);
  if (!existing) return;
  const next: BorrowRecordWithDetails = {
    ...existing,
    ...patch,
    // Preserve SSR/densified Activity when lifecycle patches omit auditEvents.
    auditEvents: existing.auditEvents,
    borrowDate:
      patch.borrowDate === undefined
        ? existing.borrowDate
        : patch.borrowDate instanceof Date
          ? patch.borrowDate
          : patch.borrowDate
            ? new Date(patch.borrowDate)
            : null,
    updatedAt:
      patch.updatedAt === undefined
        ? existing.updatedAt
        : patch.updatedAt instanceof Date
          ? patch.updatedAt
          : patch.updatedAt
            ? new Date(patch.updatedAt)
            : null,
    approvedAt:
      patch.approvedAt === undefined
        ? existing.approvedAt
        : patch.approvedAt instanceof Date
          ? patch.approvedAt.toISOString()
          : patch.approvedAt,
    cancelledAt:
      patch.cancelledAt === undefined
        ? existing.cancelledAt
        : patch.cancelledAt instanceof Date
          ? patch.cancelledAt.toISOString()
          : patch.cancelledAt,
    renewedAt:
      patch.renewedAt === undefined
        ? existing.renewedAt
        : patch.renewedAt instanceof Date
          ? patch.renewedAt.toISOString()
          : patch.renewedAt,
  };
  queryClient.setQueryData<BorrowRecordWithDetails>(key, next);
}

/** Label for borrow detail Activity timeline (ticket audit DNA). */
function borrowAuditLabel(
  action: string,
  details?: Record<string, unknown> | null,
): string {
  const status = typeof details?.status === "string" ? details.status : null;
  if (action === "CREATE") return "Borrow request created";
  if (action === "DELETE") return "Borrow record deleted";
  if (status === "BORROWED") return "Status → Borrowed";
  if (status === "RETURNED") return "Status → Returned";
  if (status === "CANCELLED") return "Status → Cancelled";
  if (status === "PENDING") return "Status → Pending";
  if (status) return `Status → ${String(status).split("_").join(" ")}`;
  return "Borrow updated";
}

/** Match review detail Activity FIFO (User 360 DNA). */
const BORROW_AUDIT_FIFO = 25;

/**
 * Prepend a densified audit row onto Borrow Queue detail Activity (FIFO-25).
 * Cold-seeds from list cache when detail was never opened (create → soft-nav).
 * Call alongside densifyActivityLog after borrow.lifecycle writes.
 */
export function prependBorrowAuditEvent(
  queryClient: QueryClient,
  args: {
    recordId: string;
    action: string;
    details?: Record<string, unknown> | null;
    actorId?: string | null;
    actorName?: string | null;
    actorEmail?: string | null;
    actorUniversityCard?: string | null;
  },
): void {
  const key = queryKeys.borrows.requestDetail(args.recordId);
  const prev =
    queryClient.getQueryData<BorrowRecordWithDetails>(key) ??
    findCachedRequestRow(queryClient, args.recordId);
  if (!prev) return;

  const actorUniversityCard = resolveBorrowActorCard(
    prev,
    args.actorId,
    args.actorUniversityCard,
  );

  const event: TicketActivityEvent = {
    id: `densify-borrow-${args.recordId}-${Date.now()}`,
    kind: "audit",
    at: new Date().toISOString(),
    label: borrowAuditLabel(args.action, args.details),
    actorId: args.actorId ?? null,
    actorName: args.actorName ?? null,
    actorEmail: args.actorEmail ?? null,
    actorUniversityCard,
    detail:
      typeof args.details?.title === "string" ? args.details.title : null,
  };

  const existing = prev.auditEvents ?? [];
  queryClient.setQueryData<BorrowRecordWithDetails>(key, {
    ...prev,
    auditEvents: [event, ...existing].slice(0, BORROW_AUDIT_FIFO),
  });
}

/** Prefer passed card; else reuse sibling audit / issuer actors for same actorId. */
function resolveBorrowActorCard(
  prev: BorrowRecordWithDetails,
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
  for (const actor of [
    prev.approvedByActor,
    prev.returnedByActor,
    prev.cancelledByActor,
  ]) {
    if (actor?.id === actorId && actor.universityCard) {
      return actor.universityCard;
    }
  }
  return null;
}

function findCachedRequestRow(
  queryClient: QueryClient,
  recordId: string,
): BorrowRecordWithDetails | undefined {
  for (const [, rows] of queryClient.getQueriesData<BorrowRecordWithDetails[]>(
    { queryKey: queryKeys.borrows.requestsRoot },
  )) {
    if (!Array.isArray(rows)) continue;
    const hit = rows.find((r) => r.id === recordId);
    if (hit) return hit;
  }
  return undefined;
}

function userIdFromUserBorrowsKey(key: QueryKey): string | undefined {
  // ["user-borrows", userId, status?]
  if (!Array.isArray(key) || key.length < 2) return undefined;
  return typeof key[1] === "string" ? key[1] : undefined;
}

function statusFilterFromRequestsKey(key: QueryKey): string | undefined {
  // ["borrow-requests", { status, search }]
  if (!Array.isArray(key) || key.length < 2) return undefined;
  const filters = key[1] as { status?: string } | undefined;
  if (!filters || typeof filters !== "object") return undefined;
  const status = filters.status;
  if (!status || status === "all") return undefined;
  return status;
}

function applyRowPatch<T extends { id: string }>(
  rows: T[],
  recordId: string,
  patch: BorrowRowPatch,
): T[] {
  return rows.map((row) =>
    row.id === recordId ? ({ ...row, ...patch } as T) : row,
  );
}

function filterByStatusIfNeeded<T extends { status: string }>(
  rows: T[],
  statusFilter: string | undefined,
): T[] {
  if (!statusFilter) return rows;
  return rows.filter((r) => r.status === statusFilter);
}

/** Pre-invalidate snapshots so sibling rows survive a thin cache after invalidate. */
export function snapshotBorrowListBaselines(
  queryClient: QueryClient,
): BorrowListBaselines {
  const users: Record<string, BorrowRecordFull[]> = {};
  for (const [key, rows] of queryClient.getQueriesData<BorrowRecordFull[]>({
    queryKey: queryKeys.borrows.userRoot,
  })) {
    if (!rows?.length) continue;
    const userId = userIdFromUserBorrowsKey(key);
    if (!userId) continue;
    if (!users[userId] || rows.length > users[userId].length) {
      users[userId] = rows;
    }
  }

  let requests: BorrowRecordWithDetails[] | undefined;
  for (const [, rows] of queryClient.getQueriesData<BorrowRecordWithDetails[]>(
    { queryKey: queryKeys.borrows.requestsRoot },
  )) {
    if (!rows?.length) continue;
    if (!requests || rows.length > requests.length) requests = rows;
  }

  return { users, requests };
}

/** Snapshot book detail availableCopies + borrowStats for densify after wipe. */
export function snapshotBookInventoryBaselines(
  queryClient: QueryClient,
  bookIds: string[],
): BookInventoryBaselines {
  const availableCopies: Record<string, number> = {};
  const stats: Record<string, BookBorrowStats> = {};

  for (const bookId of bookIds) {
    if (!bookId) continue;
    const detail = queryClient.getQueryData<{ availableCopies?: number }>(
      queryKeys.books.detail(bookId),
    );
    if (typeof detail?.availableCopies === "number") {
      availableCopies[bookId] = detail.availableCopies;
    }
    const borrowStats = queryClient.getQueryData<BookBorrowStats>(
      queryKeys.books.borrowStats(bookId),
    );
    if (borrowStats) {
      stats[bookId] = { ...borrowStats };
    }
  }

  return { availableCopies, stats };
}

export function snapshotBorrowCacheBaselines(
  queryClient: QueryClient,
  bookIds: string[] = [],
): BorrowCacheBaselines {
  const lists = snapshotBorrowListBaselines(queryClient);
  const fromLists = new Set<string>(bookIds);
  for (const rows of Object.values(lists.users)) {
    for (const row of rows) {
      if (row.bookId) fromLists.add(row.bookId);
    }
  }
  for (const row of lists.requests ?? []) {
    if (row.bookId) fromLists.add(row.bookId);
  }
  return {
    ...lists,
    inventory: snapshotBookInventoryBaselines(queryClient, [...fromLists]),
  };
}

/** Locate userId / bookId / status for a borrow row from any cached list. */
export function findCachedBorrowMeta(
  queryClient: QueryClient,
  recordId: string,
): {
  userId?: string;
  bookId?: string;
  status?: BorrowStatus;
} | undefined {
  for (const [key, rows] of queryClient.getQueriesData<BorrowRecordFull[]>({
    queryKey: queryKeys.borrows.userRoot,
  })) {
    const hit = rows?.find((r) => r.id === recordId);
    if (hit) {
      return {
        userId: hit.userId ?? userIdFromUserBorrowsKey(key),
        bookId: hit.bookId,
        status: hit.status,
      };
    }
  }
  for (const [, rows] of queryClient.getQueriesData<BorrowRecordWithDetails[]>(
    { queryKey: queryKeys.borrows.requestsRoot },
  )) {
    const hit = rows?.find((r) => r.id === recordId);
    if (hit) {
      return {
        userId: hit.userId,
        bookId: hit.bookId,
        status: hit.status,
      };
    }
  }
  return undefined;
}

function mapUserBorrowLists(
  queryClient: QueryClient,
  userId: string | null | undefined,
  mapper: (rows: BorrowRecordFull[]) => BorrowRecordFull[],
  baselines?: BorrowListBaselines,
): void {
  if (!userId) return;

  queryClient.setQueriesData<BorrowRecordFull[]>(
    { queryKey: queryKeys.borrows.user(userId) },
    (old) => (old ? mapper(old) : old),
  );

  // Re-seed densest baseline onto the unfiltered profile key after wipe.
  const mainKey = queryKeys.borrows.user(userId);
  writeMappedList(
    queryClient,
    mainKey,
    queryClient.getQueryData<BorrowRecordFull[]>(mainKey),
    baselines?.users[userId],
    mapper,
  );
}

function mapRequestLists(
  queryClient: QueryClient,
  mapper: (rows: BorrowRecordWithDetails[]) => BorrowRecordWithDetails[],
  baselines?: BorrowListBaselines,
): void {
  for (const [key, rows] of queryClient.getQueriesData<
    BorrowRecordWithDetails[]
  >({ queryKey: queryKeys.borrows.requestsRoot })) {
    if (!rows) continue;
    const statusFilter = statusFilterFromRequestsKey(key);
    const next = filterByStatusIfNeeded(mapper(rows), statusFilter);
    queryClient.setQueryData(key, next);
    // Last PENDING approve/reject → mark intentional [] (soft-nav SSR reseed).
    if (Array.isArray(next) && next.length === 0) {
      markDensifiedEmpty(key);
    }
  }

  // Re-seed densest baseline into common observer keys after wipe.
  const baseline = baselines?.requests;
  if (!baseline) return;

  const mapped = mapper(baseline);
  const unfilteredKey = queryKeys.borrows.requests({
    status: undefined,
    search: undefined,
  });
  queryClient.setQueryData(unfilteredKey, mapped);
  if (mapped.length === 0) {
    markDensifiedEmpty(unfilteredKey);
  } else {
    clearDensifiedEmpty(unfilteredKey);
  }

  const pendingKey = queryKeys.borrows.requests({
    status: "PENDING",
    search: undefined,
  });
  const pendingOnly = mapped.filter((r) => r.status === "PENDING");
  queryClient.setQueryData(pendingKey, pendingOnly);
  if (pendingOnly.length === 0) {
    markDensifiedEmpty(pendingKey);
  } else {
    clearDensifiedEmpty(pendingKey);
  }
}

/**
 * Absolute availableCopies after return+offer (net may be 0). Also syncs
 * queue/detail bookAvailableCopies so dialog fallbacks stay correct.
 */
export function setBookAvailableCopiesAbsolute(
  queryClient: QueryClient,
  bookId: string | null | undefined,
  availableCopies: number,
): void {
  if (!bookId || !Number.isFinite(availableCopies)) return;
  const capped = Math.max(0, availableCopies);
  const detailKey = queryKeys.books.detail(bookId);
  queryClient.setQueryData(detailKey, (old: unknown) => {
    if (!old || typeof old !== "object") {
      return { id: bookId, availableCopies: capped };
    }
    const row = old as { totalCopies?: number };
    const next =
      typeof row.totalCopies === "number"
        ? Math.min(row.totalCopies, capped)
        : capped;
    return { ...(old as object), availableCopies: next };
  });
  const detailAfter = queryClient.getQueryData<{ availableCopies?: number }>(
    detailKey,
  );
  const synced =
    typeof detailAfter?.availableCopies === "number"
      ? detailAfter.availableCopies
      : capped;
  patchAdminListAvailability(queryClient, bookId, synced);
  syncBorrowRequestBookFields(queryClient, bookId, {
    availableCopies: synced,
  });
}

/** Patch availableCopies on book detail (+ optional borrowStats deltas). */
export function patchBookInventory(
  queryClient: QueryClient,
  bookId: string | null | undefined,
  args: {
    availableDelta?: number;
    activeDelta?: number;
    returnedDelta?: number;
    totalDelta?: number;
  },
  baselines?: BookInventoryBaselines,
): void {
  if (!bookId) return;

  const availableDelta = args.availableDelta ?? 0;
  if (availableDelta !== 0) {
    const detailKey = queryKeys.books.detail(bookId);
    const prevCopies =
      queryClient.getQueryData<{ availableCopies?: number }>(detailKey)
        ?.availableCopies ?? baselines?.availableCopies[bookId];

    queryClient.setQueryData(detailKey, (old: unknown) => {
      if (!old || typeof old !== "object") {
        if (typeof prevCopies !== "number") return old;
        return {
          id: bookId,
          availableCopies: Math.max(0, prevCopies + availableDelta),
        };
      }
      const row = old as { availableCopies?: number; totalCopies?: number };
      const base =
        typeof row.availableCopies === "number"
          ? row.availableCopies
          : typeof prevCopies === "number"
            ? prevCopies
            : undefined;
      if (typeof base !== "number") return old;
      const next = Math.max(0, base + availableDelta);
      const capped =
        typeof row.totalCopies === "number"
          ? Math.min(row.totalCopies, next)
          : next;
      return { ...row, availableCopies: capped };
    });

    // Soft-nav /all-books must show the same availability as detail.
    const detailAfter = queryClient.getQueryData<{ availableCopies?: number }>(
      queryKeys.books.detail(bookId),
    );
    if (typeof detailAfter?.availableCopies === "number") {
      patchAdminListAvailability(
        queryClient,
        bookId,
        detailAfter.availableCopies,
      );
      syncBorrowRequestBookFields(queryClient, bookId, {
        availableCopies: detailAfter.availableCopies,
      });
    }
  }

  const statsKey = queryKeys.books.borrowStats(bookId);
  const prevStats =
    queryClient.getQueryData<BookBorrowStats>(statsKey) ??
    baselines?.stats[bookId];
  if (
    prevStats &&
    (args.activeDelta || args.returnedDelta || args.totalDelta)
  ) {
    queryClient.setQueryData<BookBorrowStats>(statsKey, {
      totalBorrows: Math.max(
        0,
        prevStats.totalBorrows + (args.totalDelta ?? 0),
      ),
      activeBorrows: Math.max(
        0,
        prevStats.activeBorrows + (args.activeDelta ?? 0),
      ),
      returnedBorrows: Math.max(
        0,
        prevStats.returnedBorrows + (args.returnedDelta ?? 0),
      ),
    });
  }
}

/**
 * After invalidate wipe — re-seed absolute inventory values snapped while
 * optimistic/densify paint was still in cache (do not re-apply deltas).
 */
export function restoreBookInventoryFromBaselines(
  queryClient: QueryClient,
  bookId: string | null | undefined,
  baselines?: BookInventoryBaselines,
): void {
  if (!bookId || !baselines) return;

  const copies = baselines.availableCopies[bookId];
  if (typeof copies === "number") {
    const detailKey = queryKeys.books.detail(bookId);
    queryClient.setQueryData(detailKey, (old: unknown) => {
      if (!old || typeof old !== "object") {
        return { id: bookId, availableCopies: copies };
      }
      return { ...(old as object), availableCopies: copies };
    });
    patchAdminListAvailability(queryClient, bookId, copies);
    syncBorrowRequestBookFields(queryClient, bookId, {
      availableCopies: copies,
    });
  }

  const stats = baselines.stats[bookId];
  if (stats) {
    queryClient.setQueryData(queryKeys.books.borrowStats(bookId), { ...stats });
  }
}

/** After approve / reject / return — re-seed status patch (+ optional inventory). */
export function patchBorrowCachesOnStatusChange(
  queryClient: QueryClient,
  args: {
    recordId: string;
    patch: BorrowRowPatch;
    userId?: string | null;
    bookId?: string | null;
    /**
     * Pre-mutate status for overview KPI deltas. Required when onMutate already
     * rewrote list rows — post-optimistic baselines report the *new* status and
     * would make Active/Returned/Cancelled badge bumps no-ops.
     */
    fromStatus?: BorrowStatus | null;
    /**
     * Live delta (onMutate). After invalidate, prefer `restoreInventory` with
     * baselines snapped while the optimistic inventory was already applied.
     */
    inventory?: {
      availableDelta?: number;
      activeDelta?: number;
      returnedDelta?: number;
      totalDelta?: number;
    };
    /** Re-seed absolute inventory from baselines (post-invalidate densify). */
    restoreInventory?: boolean;
  },
  baselines?: BorrowCacheBaselines,
): void {
  const meta =
    findCachedBorrowMeta(queryClient, args.recordId) ??
    (args.userId || args.bookId
      ? {
          userId: args.userId ?? undefined,
          bookId: args.bookId ?? undefined,
        }
      : undefined);

  const userId =
    args.userId ??
    meta?.userId ??
    Object.entries(baselines?.users ?? {}).find(([, rows]) =>
      rows.some((r) => r.id === args.recordId),
    )?.[0];

  const bookId = args.bookId ?? meta?.bookId;

  // Prefer explicit pre-mutate status; baseline is only safe when onMutate did not run.
  const fromStatus =
    args.fromStatus !== undefined
      ? args.fromStatus
      : (baselines?.requests?.find((r) => r.id === args.recordId)?.status ??
        (userId
          ? baselines?.users?.[userId]?.find((r) => r.id === args.recordId)
              ?.status
          : undefined) ??
        null);

  mapUserBorrowLists(
    queryClient,
    userId,
    (rows) => applyRowPatch(rows, args.recordId, args.patch),
    baselines,
  );

  mapRequestLists(
    queryClient,
    (rows) => applyRowPatch(rows, args.recordId, args.patch),
    baselines,
  );

  upsertBorrowRequestDetail(queryClient, args.recordId, args.patch);

  if (args.restoreInventory) {
    restoreBookInventoryFromBaselines(
      queryClient,
      bookId,
      baselines?.inventory,
    );
  } else if (args.inventory) {
    patchBookInventory(
      queryClient,
      bookId,
      args.inventory,
      baselines?.inventory,
    );
  }

  syncPendingBorrowsNav(queryClient);

  if (args.patch.status) {
    patchAdminStatsOnBorrowStatusChange(queryClient, {
      recordId: args.recordId,
      fromStatus,
      toStatus: args.patch.status,
      bookIsActive: resolveBookIsActiveForStats(queryClient, bookId),
    });
  }

  // Absolute recount from densified universe heals any missed delta (badge drift).
  const universe = queryClient.getQueryData<BorrowRecordWithDetails[]>(
    queryKeys.borrows.requests({ status: undefined, search: undefined }),
  );
  syncAdminStatsBorrowCountsFromRows(queryClient, universe);
  densifyUserFineMetrics(queryClient, userId);
  evictAnalyticsCaches(queryClient);
}

/** Optional actor/book display fields for admin queue densify on create. */
export type BorrowCreateRequestMeta = {
  userName?: string;
  userEmail?: string;
  userUniversityId?: number;
  userUniversityCard?: string | null;
  bookTitle?: string;
  bookAuthor?: string;
  bookGenre?: string;
  bookRating?: number | null;
  bookCoverUrl?: string | null;
  bookCoverColor?: string | null;
};

/**
 * Build admin Borrow Queue row from create payload + book detail / user-borrows cache.
 * Soft-nav to /admin/book-requests must see the new PENDING without a second visit.
 */
function buildRequestRowFromCreate(
  queryClient: QueryClient,
  args: {
    userId: string;
    tempId: string;
    serverRecord: Partial<BorrowRecordFull> & { id: string };
    requestMeta?: BorrowCreateRequestMeta;
  },
  baselines?: BorrowListBaselines,
): BorrowRecordWithDetails {
  const bookId = args.serverRecord.bookId ?? "";
  const userBorrow =
    baselines?.users[args.userId]?.find(
      (r) => r.id === args.tempId || r.id === args.serverRecord.id,
    ) ??
    queryClient
      .getQueryData<BorrowRecordFull[]>(queryKeys.borrows.user(args.userId))
      ?.find((r) => r.id === args.tempId || r.id === args.serverRecord.id);
  const bookFromDetail = bookId
    ? queryClient.getQueryData<{
        title?: string;
        author?: string;
        genre?: string;
        coverUrl?: string | null;
        coverColor?: string | null;
      }>(queryKeys.books.detail(bookId))
    : undefined;
  const book = args.serverRecord.book ?? userBorrow?.book;
  const meta = args.requestMeta;

  return {
    id: args.serverRecord.id,
    userId: args.serverRecord.userId ?? args.userId,
    bookId,
    borrowDate: args.serverRecord.borrowDate ?? userBorrow?.borrowDate ?? null,
    dueDate: args.serverRecord.dueDate ?? null,
    returnDate: args.serverRecord.returnDate ?? null,
    approvedAt: args.serverRecord.approvedAt ?? null,
    cancelledAt: args.serverRecord.cancelledAt ?? null,
    renewedAt: args.serverRecord.renewedAt ?? null,
    status: args.serverRecord.status ?? "PENDING",
    borrowedBy: args.serverRecord.borrowedBy ?? null,
    returnedBy: args.serverRecord.returnedBy ?? null,
    fineAmount: args.serverRecord.fineAmount ?? "0",
    notes: args.serverRecord.notes ?? null,
    renewalCount: args.serverRecord.renewalCount ?? 0,
    lastReminderSent: args.serverRecord.lastReminderSent ?? null,
    updatedAt: args.serverRecord.updatedAt ?? null,
    updatedBy: args.serverRecord.updatedBy ?? null,
    createdAt: args.serverRecord.createdAt ?? userBorrow?.createdAt ?? null,
    userName: meta?.userName ?? "User",
    userEmail: meta?.userEmail ?? "",
    userUniversityId: meta?.userUniversityId ?? 0,
    userUniversityCard: meta?.userUniversityCard ?? null,
    bookTitle:
      meta?.bookTitle ?? book?.title ?? bookFromDetail?.title ?? "Unknown Book",
    bookAuthor:
      meta?.bookAuthor ?? book?.author ?? bookFromDetail?.author ?? "Unknown Author",
    bookGenre: meta?.bookGenre ?? book?.genre ?? bookFromDetail?.genre ?? "",
    bookRating:
      meta?.bookRating ??
      (typeof book?.rating === "number" ? book.rating : null) ??
      null,
    bookCoverUrl:
      meta?.bookCoverUrl ?? book?.coverUrl ?? bookFromDetail?.coverUrl ?? null,
    bookCoverColor:
      meta?.bookCoverColor ??
      book?.coverColor ??
      bookFromDetail?.coverColor ??
      null,
  };
}

/** Upsert admin queue row (create path — temp id was never on borrow-requests). */
function upsertRequestRow(
  rows: BorrowRecordWithDetails[],
  row: BorrowRecordWithDetails,
  tempId: string,
): BorrowRecordWithDetails[] {
  const withoutTemp = rows.filter((r) => r.id !== tempId && r.id !== row.id);
  return [row, ...withoutTemp];
}

/**
 * After borrow create — replace optimistic temp id with server id, upsert
 * admin borrow-requests (unfiltered + PENDING), then sync nav + overview KPIs.
 */
export function patchBorrowCachesOnCreate(
  queryClient: QueryClient,
  args: {
    userId: string;
    tempId: string;
    serverRecord: Partial<BorrowRecordFull> & { id: string };
    /** Display fields for admin Borrow Queue densify (session + book cache). */
    requestMeta?: BorrowCreateRequestMeta;
    /** Claim path: decrement available copies when creating BORROWED. */
    inventory?: {
      availableDelta?: number;
      activeDelta?: number;
      returnedDelta?: number;
      totalDelta?: number;
    };
    inventoryBaselines?: BookInventoryBaselines;
  },
  baselines?: BorrowListBaselines,
): void {
  const replaceTemp = (rows: BorrowRecordFull[]): BorrowRecordFull[] => {
    const idx = rows.findIndex((r) => r.id === args.tempId);
    if (idx === -1) {
      // Temp already wiped — upsert server row (keep book from any sibling).
      const existing = rows.find((r) => r.id === args.serverRecord.id);
      if (existing) {
        return rows.map((r) =>
          r.id === args.serverRecord.id
            ? { ...r, ...args.serverRecord, book: r.book ?? args.serverRecord.book }
            : r,
        );
      }
      const bookFromBaseline = baselines?.users[args.userId]?.find(
        (r) => r.id === args.tempId,
      )?.book;
      return [
        {
          ...(bookFromBaseline ? { book: bookFromBaseline } : {}),
          ...args.serverRecord,
          userId: args.serverRecord.userId ?? args.userId,
          bookId: args.serverRecord.bookId ?? "",
          status: args.serverRecord.status ?? "PENDING",
          borrowDate: args.serverRecord.borrowDate ?? null,
          dueDate: args.serverRecord.dueDate ?? null,
          returnDate: args.serverRecord.returnDate ?? null,
          approvedAt: args.serverRecord.approvedAt ?? null,
          cancelledAt: args.serverRecord.cancelledAt ?? null,
          renewedAt: args.serverRecord.renewedAt ?? null,
          borrowedBy: args.serverRecord.borrowedBy ?? null,
          returnedBy: args.serverRecord.returnedBy ?? null,
          fineAmount: args.serverRecord.fineAmount ?? null,
          notes: args.serverRecord.notes ?? null,
          renewalCount: args.serverRecord.renewalCount ?? 0,
          lastReminderSent: args.serverRecord.lastReminderSent ?? null,
          updatedAt: args.serverRecord.updatedAt ?? null,
          updatedBy: args.serverRecord.updatedBy ?? null,
          createdAt: args.serverRecord.createdAt ?? null,
        } as BorrowRecordFull,
        ...rows,
      ];
    }
    return rows.map((r, i) =>
      i === idx
        ? {
            ...r,
            ...args.serverRecord,
            id: args.serverRecord.id,
            book: r.book ?? args.serverRecord.book,
          }
        : r,
    );
  };

  mapUserBorrowLists(queryClient, args.userId, replaceTemp, baselines);

  // Admin queue: upsert (create never wrote temp onto borrow-requests).
  const requestRow = buildRequestRowFromCreate(queryClient, args, baselines);
  mapRequestLists(
    queryClient,
    (rows) => upsertRequestRow(rows, requestRow, args.tempId),
    baselines,
  );
  queryClient.setQueryData(
    queryKeys.borrows.requestDetail(requestRow.id),
    requestRow,
  );

  if (args.inventory) {
    patchBookInventory(
      queryClient,
      args.serverRecord.bookId,
      args.inventory,
      args.inventoryBaselines,
    );
  }

  syncPendingBorrowsNav(queryClient);

  // Delta then absolute recount from densified universe (badge drift heal).
  patchAdminStatsOnBorrowStatusChange(queryClient, {
    recordId: args.serverRecord.id,
    fromStatus: null,
    toStatus: args.serverRecord.status ?? "PENDING",
    bookIsActive: resolveBookIsActiveForStats(
      queryClient,
      args.serverRecord.bookId,
    ),
  });
  const universe = queryClient.getQueryData<BorrowRecordWithDetails[]>(
    queryKeys.borrows.requests({ status: undefined, search: undefined }),
  );
  syncAdminStatsBorrowCountsFromRows(queryClient, universe);
  evictAnalyticsCaches(queryClient);
}

/**
 * After renew — patch dueDate/renewalCount on user-borrows + admin borrow-requests.
 */
export function patchBorrowCachesOnRenewal(
  queryClient: QueryClient,
  args: {
    recordId: string;
    userId: string;
    dueDate: string | Date | null;
    renewalCount: number;
    renewedAt?: string | Date | null;
  },
  baselines?: BorrowListBaselines,
): void {
  // BorrowRecord.dueDate is ISO string | null in list types.
  const nextDue: string | null =
    args.dueDate instanceof Date
      ? args.dueDate.toISOString()
      : args.dueDate;
  const nextRenewedAt: string | null =
    args.renewedAt === undefined
      ? new Date().toISOString()
      : args.renewedAt instanceof Date
        ? args.renewedAt.toISOString()
        : args.renewedAt;
  mapUserBorrowLists(
    queryClient,
    args.userId,
    (rows) =>
      rows.map((r) =>
        r.id === args.recordId
          ? ({
              ...r,
              dueDate: nextDue as BorrowRecordFull["dueDate"],
              renewalCount: args.renewalCount,
              renewedAt: nextRenewedAt,
            } as BorrowRecordFull)
          : r,
      ),
    baselines,
  );
  mapRequestLists(
    queryClient,
    (rows) =>
      rows.map((r) =>
        r.id === args.recordId
          ? ({
              ...r,
              dueDate: nextDue as BorrowRecordWithDetails["dueDate"],
              renewalCount: args.renewalCount,
              renewedAt: nextRenewedAt,
            } as BorrowRecordWithDetails)
          : r,
      ),
    baselines,
  );
  upsertBorrowRequestDetail(queryClient, args.recordId, {
    dueDate: nextDue,
    renewalCount: args.renewalCount,
    renewedAt: nextRenewedAt,
  });
}

/** Densify fine fields after waive/adjust/paid/stamp (fine.write). */
export function patchBorrowFineUpdate(
  queryClient: QueryClient,
  recordId: string,
  patch: {
    fineAmount: string;
    displayFineAmount?: string;
    fineStatus?: string | null;
  },
): void {
  const displayFineAmount = patch.displayFineAmount ?? patch.fineAmount;
  const rowPatch: BorrowRowPatch = {
    fineAmount: patch.fineAmount,
    displayFineAmount,
    fineStatus: patch.fineStatus ?? null,
  };

  queryClient.setQueriesData<BorrowRecordFull[]>(
    { queryKey: queryKeys.borrows.userRoot },
    (old) => (old ? applyRowPatch(old, recordId, rowPatch) : old),
  );

  mapRequestLists(queryClient, (rows) =>
    applyRowPatch(rows, recordId, rowPatch),
  );
  upsertBorrowRequestDetail(queryClient, recordId, rowPatch);
  densifyUserFineMetricsForBorrow(queryClient, recordId);
  evictAnalyticsCaches(queryClient);
}
