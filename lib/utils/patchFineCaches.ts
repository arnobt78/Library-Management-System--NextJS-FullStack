/**
 * Post-invalidate densify for fine.write — fine config + overdue borrow fines.
 * Call via commitMutationCache after invalidate.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type {
  FineConfig,
  OverdueFineUpdateResult,
} from "@/lib/services/admin";
import type { BorrowRecordFull, BorrowRecordWithDetails } from "@/lib/services/borrows";
import { evictAnalyticsCaches } from "@/lib/utils/evictAnalyticsCaches";

/** Write fine-config KPI after admin saves daily amount. */
export function densifyFineConfig(
  queryClient: QueryClient,
  config: FineConfig | null | undefined,
): void {
  if (!config || typeof config.fineAmount !== "number") return;
  queryClient.setQueryData<FineConfig>(queryKeys.admin.fineConfig, config);
  evictAnalyticsCaches(queryClient);
}

/**
 * Patch fineAmount on cached borrow rows after overdue fine recalculation.
 * Soft-nav profile / borrow queue must show new fines without a second visit.
 */
export function densifyOverdueFines(
  queryClient: QueryClient,
  results: OverdueFineUpdateResult[] | null | undefined,
): void {
  if (!Array.isArray(results) || results.length === 0) {
    evictAnalyticsCaches(queryClient);
    return;
  }

  const byId = new Map(
    results
      .filter((r) => r.updated && r.recordId)
      .map((r) => [r.recordId, r.verifiedFineAmount ?? r.fineAmount] as const),
  );
  if (byId.size === 0) {
    evictAnalyticsCaches(queryClient);
    return;
  }

  queryClient.setQueriesData<BorrowRecordFull[]>(
    { queryKey: queryKeys.borrows.userRoot },
    (old) =>
      old
        ? old.map((row) => {
            const next = byId.get(row.id);
            return next !== undefined ? { ...row, fineAmount: next } : row;
          })
        : old,
  );

  queryClient.setQueriesData<BorrowRecordWithDetails[]>(
    { queryKey: queryKeys.borrows.requestsRoot },
    (old) =>
      old
        ? old.map((row) => {
            const next = byId.get(row.id);
            return next !== undefined ? { ...row, fineAmount: next } : row;
          })
        : old,
  );

  evictAnalyticsCaches(queryClient);
}
