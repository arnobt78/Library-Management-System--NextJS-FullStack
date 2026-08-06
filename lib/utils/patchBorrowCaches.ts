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
  clearDensifiedEmpty,
  markDensifiedEmpty,
  writeMappedList,
} from "@/lib/utils/queryCacheLists";

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
  fineAmount?: string | null;
  returnedBy?: string | null;
  borrowDate?: Date | string | null;
};

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
}

/**
 * After borrow create — replace optimistic temp id with server id and re-seed
 * user-borrows (and pending requests if the optimistic row was present).
 */
export function patchBorrowCachesOnCreate(
  queryClient: QueryClient,
  args: {
    userId: string;
    tempId: string;
    serverRecord: Partial<BorrowRecordFull> & { id: string };
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

  // Requests: replace temp id if present in baselines (admin may not have it).
  mapRequestLists(
    queryClient,
    (rows) =>
      rows.map((r) =>
        r.id === args.tempId
          ? ({ ...r, ...args.serverRecord, id: args.serverRecord.id } as BorrowRecordWithDetails)
          : r,
      ),
    baselines,
  );

  syncPendingBorrowsNav(queryClient);
}
