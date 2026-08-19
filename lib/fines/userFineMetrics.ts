/**
 * User-scoped fine KPIs — mirrors getAdminUserProfile outstanding/overdue logic.
 * Parent: Densify instant UI closeout (User 360 Fine/Overdue KPIs).
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { FineConfig } from "@/lib/services/admin";
import type { BorrowRecordFull } from "@/lib/services/borrows";
import {
  computeDisplayFineForBorrowRow,
  type BorrowFineDisplayRow,
} from "@/lib/fines/mapDisplayFine";
import { getOverdueDaysForBorrow } from "@/lib/fines/liveFine";
import type { FineRateHistoryRow } from "@/lib/fines/types";

export type UserFineMetrics = {
  outstandingFine: number;
  overdueCount: number;
};

export type BorrowRowForFine = Pick<
  BorrowFineDisplayRow,
  "status" | "dueDate" | "fineAmount" | "fineStatus"
>;

function mapBorrowRow(row: {
  status: string;
  dueDate: Date | string | null;
  fineAmount?: number | string | null;
  displayFineAmount?: string | null;
  fineStatus?: string | null;
}): BorrowRowForFine {
  return {
    status: row.status,
    dueDate: row.dueDate,
    fineAmount: row.displayFineAmount ?? row.fineAmount ?? null,
    fineStatus: row.fineStatus,
  };
}

/** Collect borrow rows for one user from warmed user-borrows + queue caches. */
export function collectCachedBorrowRowsForUser(
  queryClient: QueryClient,
  userId: string,
): BorrowRowForFine[] {
  const byId = new Map<string, BorrowRowForFine>();

  for (const [key, rows] of queryClient.getQueriesData<BorrowRecordFull[]>({
    queryKey: queryKeys.borrows.userRoot,
  })) {
    if (!rows?.length) continue;
    const keyUserId =
      Array.isArray(key) && typeof key[1] === "string" ? key[1] : undefined;
    for (const row of rows) {
      const ownerId = row.userId ?? keyUserId;
      if (ownerId !== userId) continue;
      byId.set(row.id, mapBorrowRow(row));
    }
  }

  for (const [, rows] of queryClient.getQueriesData<
    Array<BorrowRecordFull & { userId?: string }>
  >({ queryKey: queryKeys.borrows.requestsRoot })) {
    if (!rows?.length) continue;
    for (const row of rows) {
      if (row.userId !== userId) continue;
      if (!byId.has(row.id)) byId.set(row.id, mapBorrowRow(row));
    }
  }

  return [...byId.values()];
}

/** Same rules as getAdminUserProfile — overdue BORROWED rows only. */
export function computeUserFineMetrics(
  rows: readonly BorrowRowForFine[],
  dailyRate: number,
  rateHistory: readonly FineRateHistoryRow[] | undefined = undefined,
  now: Date = new Date(),
): UserFineMetrics {
  let outstandingFine = 0;
  let overdueCount = 0;

  for (const row of rows) {
    if (row.status !== "BORROWED") continue;
    if (getOverdueDaysForBorrow(row.status, row.dueDate, now) <= 0) continue;
    overdueCount += 1;
    const { liveAmount } = computeDisplayFineForBorrowRow(
      row,
      dailyRate,
      rateHistory,
      now,
    );
    outstandingFine += liveAmount;
  }

  return {
    outstandingFine: Math.round(outstandingFine * 100) / 100,
    overdueCount,
  };
}

function dailyRateFromCache(queryClient: QueryClient): number {
  const fineConfig = queryClient.getQueryData<FineConfig>(
    queryKeys.admin.fineConfig,
  );
  return typeof fineConfig?.fineAmount === "number" ? fineConfig.fineAmount : 0;
}

function roundFineAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function liveFineAmountForRow(
  row: BorrowRowForFine | null | undefined,
  dailyRate: number,
  rateHistory?: readonly FineRateHistoryRow[],
): number {
  if (!row) return 0;
  return computeDisplayFineForBorrowRow(row, dailyRate, rateHistory).liveAmount;
}

/** True when cache has fewer overdue rows than SSR/densified KPI baseline. */
export function isPartialFineMetricsRecompute(
  existing: UserFineMetrics | null | undefined,
  next: UserFineMetrics,
): boolean {
  if (!existing) return false;
  return next.overdueCount < existing.overdueCount;
}

/** True when warmed borrow rows cannot represent full user overdue set. */
export function isPartialBorrowCacheForUser(
  cachedRowCount: number,
  existing: UserFineMetrics | null | undefined,
): boolean {
  if (!existing) return false;
  return cachedRowCount < existing.overdueCount;
}

/** Read one borrow row (user + queue caches) before fine patch. */
export function findCachedBorrowRowForFine(
  queryClient: QueryClient,
  recordId: string,
): { userId: string; row: BorrowRowForFine } | null {
  for (const [key, rows] of queryClient.getQueriesData<BorrowRecordFull[]>({
    queryKey: queryKeys.borrows.userRoot,
  })) {
    const hit = rows?.find((r) => r.id === recordId);
    if (hit) {
      const userId =
        hit.userId ??
        (Array.isArray(key) && typeof key[1] === "string" ? key[1] : undefined);
      if (!userId) continue;
      return { userId, row: mapBorrowRow(hit) };
    }
  }

  for (const [, rows] of queryClient.getQueriesData<
    Array<BorrowRecordFull & { userId?: string }>
  >({ queryKey: queryKeys.borrows.requestsRoot })) {
    const hit = rows?.find((r) => r.id === recordId);
    if (hit?.userId) {
      return { userId: hit.userId, row: mapBorrowRow(hit) };
    }
  }

  const detail = queryClient.getQueryData<
    BorrowRecordFull & { userId?: string }
  >(queryKeys.borrows.requestDetail(recordId));
  if (detail?.userId) {
    return { userId: detail.userId, row: mapBorrowRow(detail) };
  }

  return null;
}

/**
 * Delta densify for single-row fine patch — avoids $0 flash when cache lacks
 * sibling overdue borrows (User 360 back-nav after waive on detail).
 */
export function patchUserFineMetricsDelta(
  queryClient: QueryClient,
  userId: string,
  beforeRow: BorrowRowForFine | null | undefined,
  afterRow: BorrowRowForFine,
  rateHistory?: readonly FineRateHistoryRow[],
): void {
  const dailyRate = dailyRateFromCache(queryClient);
  const existing = queryClient.getQueryData<UserFineMetrics>(
    queryKeys.users.fineMetrics(userId),
  );
  const beforeLive = liveFineAmountForRow(beforeRow, dailyRate, rateHistory);
  const afterLive = liveFineAmountForRow(afterRow, dailyRate, rateHistory);
  const delta = afterLive - beforeLive;

  if (existing) {
    queryClient.setQueryData<UserFineMetrics>(
      queryKeys.users.fineMetrics(userId),
      {
        outstandingFine: roundFineAmount(
          Math.max(0, existing.outstandingFine + delta),
        ),
        overdueCount: existing.overdueCount,
      },
    );
    return;
  }

  const cachedRows = collectCachedBorrowRowsForUser(queryClient, userId);
  const next = computeUserFineMetrics(cachedRows, dailyRate, rateHistory);
  queryClient.setQueryData(queryKeys.users.fineMetrics(userId), next);
}

/** Recompute metrics from TanStack cache (refetch / densify tail). */
export function recomputeUserFineMetricsFromCache(
  queryClient: QueryClient,
  userId: string,
  rateHistory?: readonly FineRateHistoryRow[],
): UserFineMetrics | null {
  const existing = queryClient.getQueryData<UserFineMetrics>(
    queryKeys.users.fineMetrics(userId),
  );
  const rows = collectCachedBorrowRowsForUser(queryClient, userId);
  if (rows.length === 0) {
    return existing ?? null;
  }
  const dailyRate = dailyRateFromCache(queryClient);
  // Without fineConfig warmed, live recompute zeros KPI — keep densified/SSR baseline.
  if (dailyRate === 0 && existing) {
    return existing;
  }
  const next = computeUserFineMetrics(
    rows,
    dailyRate,
    rateHistory,
  );
  if (isPartialFineMetricsRecompute(existing, next)) {
    return existing ?? next;
  }
  // refetchOnMount partial cache must not zero densified outstanding fine (User 360 back-nav)
  if (
    existing &&
    isPartialBorrowCacheForUser(rows.length, existing) &&
    next.outstandingFine < existing.outstandingFine
  ) {
    return { ...next, outstandingFine: existing.outstandingFine };
  }
  return next;
}

/** Patch users.fineMetrics after fine/borrow lifecycle densify. */
export function densifyUserFineMetrics(
  queryClient: QueryClient,
  userId: string | null | undefined,
): void {
  if (!userId) return;
  const next = recomputeUserFineMetricsFromCache(queryClient, userId);
  if (!next) return;
  queryClient.setQueryData(queryKeys.users.fineMetrics(userId), next);
}

/** Resolve borrower from any warmed borrow list and patch fine KPIs. */
export function densifyUserFineMetricsForBorrow(
  queryClient: QueryClient,
  recordId: string,
): void {
  densifyUserFineMetrics(
    queryClient,
    findCachedBorrowRowForFine(queryClient, recordId)?.userId,
  );
}
