/**
 * Thin densify helpers for reservation.lifecycle.
 *
 * Call via commitMutationCache after invalidate so related reservation /
 * book-detail keys stay coherent without a fetch waterfall.
 * Create upserts WAITING rows into user/book lists when ids are known.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  clearDensifiedEmpty,
  writeMappedList,
} from "@/lib/utils/queryCacheLists";

export type ReservationStatus =
  | "WAITING"
  | "READY"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

export type ReservationRow = {
  id: string;
  status: string;
  bookId?: string;
  userId?: string;
  queuePosition?: number | null;
  bookTitle?: string;
  readyExpiresAt?: string | null;
};

export type ReservationListBaselines = {
  /** userId → densest cached user-reservations list */
  users: Record<string, ReservationRow[]>;
  /** bookId → densest cached book queue */
  queues: Record<string, ReservationRow[]>;
};

/** Optional pre-invalidate snapshot of reservation list keys. */
export function snapshotReservationBaselines(
  queryClient: QueryClient,
): ReservationListBaselines {
  const users: ReservationListBaselines["users"] = {};
  for (const [key, rows] of queryClient.getQueriesData<ReservationRow[]>({
    queryKey: queryKeys.circulation.reservationsRoot,
  })) {
    if (!rows?.length || !Array.isArray(key) || key[1] !== "user") continue;
    const userId = typeof key[2] === "string" ? key[2] : undefined;
    if (!userId) continue;
    if (!users[userId] || rows.length > users[userId].length) {
      users[userId] = rows;
    }
  }

  const queues: ReservationListBaselines["queues"] = {};
  for (const [key, rows] of queryClient.getQueriesData<ReservationRow[]>({
    queryKey: queryKeys.circulation.reservationsRoot,
  })) {
    if (!rows?.length || !Array.isArray(key) || key[1] !== "book") continue;
    const bookId = typeof key[2] === "string" ? key[2] : undefined;
    if (!bookId) continue;
    if (!queues[bookId] || rows.length > queues[bookId].length) {
      queues[bookId] = rows;
    }
  }

  return { users, queues };
}

function upsertReservationRow(
  rows: ReservationRow[],
  row: ReservationRow,
): ReservationRow[] {
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx === -1) return [row, ...rows];
  return rows.map((r, i) => (i === idx ? { ...r, ...row } : r));
}

/**
 * After reserve — upsert WAITING row into user list + book queue.
 */
export function densifyReservationCreate(
  queryClient: QueryClient,
  row: ReservationRow,
  baselines?: ReservationListBaselines,
): void {
  if (row.userId) {
    const key = queryKeys.circulation.userReservations(row.userId);
    writeMappedList(
      queryClient,
      key,
      queryClient.getQueryData<ReservationRow[]>(key),
      baselines?.users[row.userId],
      (rows) => upsertReservationRow(rows, { ...row, status: "WAITING" }),
    );
    clearDensifiedEmpty(key);
  }

  if (row.bookId) {
    const queueKey = queryKeys.circulation.bookQueue(row.bookId);
    writeMappedList(
      queryClient,
      queueKey,
      queryClient.getQueryData<ReservationRow[]>(queueKey),
      baselines?.queues[row.bookId],
      (rows) => upsertReservationRow(rows, { ...row, status: "WAITING" }),
    );
    clearDensifiedEmpty(queueKey);
  }
}

/**
 * Patch reservation status on user/book queue keys; optionally touch book
 * detail when `bookId` is known (availability may change on claim).
 */
export function densifyReservationStatus(
  queryClient: QueryClient,
  args: {
    id: string;
    status: ReservationStatus;
    bookId?: string;
    userId?: string;
  },
  baselines?: ReservationListBaselines,
): void {
  const patchRows = <T extends { id: string; status: string }>(
    rows: T[] | undefined,
  ): T[] | undefined =>
    rows?.map((row) =>
      row.id === args.id ? { ...row, status: args.status } : row,
    );

  if (args.userId) {
    const key = queryKeys.circulation.userReservations(args.userId);
    const fromCache = queryClient.getQueryData<ReservationRow[]>(key);
    const next =
      patchRows(fromCache) ?? patchRows(baselines?.users[args.userId]);
    if (next) queryClient.setQueryData(key, next);
  } else {
    queryClient.setQueriesData(
      { queryKey: queryKeys.circulation.reservationsRoot },
      (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return patchRows(old as Array<{ id: string; status: string }>);
      },
    );
  }

  if (args.bookId) {
    const queueKey = queryKeys.circulation.bookQueue(args.bookId);
    const fromCache = queryClient.getQueryData<ReservationRow[]>(queueKey);
    const next =
      patchRows(fromCache) ?? patchRows(baselines?.queues[args.bookId]);
    if (next) queryClient.setQueryData(queueKey, next);

    // Claim fulfillment may free/consume inventory; touch detail so observers
    // see a stale mark without inventing copy counts.
    if (args.status === "FULFILLED" || args.status === "CANCELLED") {
      queryClient.setQueryData(
        queryKeys.books.detail(args.bookId),
        (old: unknown) => (old && typeof old === "object" ? { ...old } : old),
      );
    }
  }
}
