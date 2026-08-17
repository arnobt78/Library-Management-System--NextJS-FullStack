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
import { evictAnalyticsCaches } from "@/lib/utils/evictAnalyticsCaches";
import { patchBorrowFineUpdate } from "@/lib/utils/patchBorrowCaches";

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
 * Patch fineAmount + fineStatus on profile, queue list, and open detail after
 * overdue fine recalculation (force update / stamp).
 */
export function densifyOverdueFines(
  queryClient: QueryClient,
  results: OverdueFineUpdateResult[] | null | undefined,
): void {
  if (!Array.isArray(results) || results.length === 0) {
    evictAnalyticsCaches(queryClient);
    return;
  }

  const updated = results.filter((r) => r.updated && r.recordId);
  if (updated.length === 0) {
    evictAnalyticsCaches(queryClient);
    return;
  }

  for (const r of updated) {
    const amount = r.verifiedFineAmount ?? r.fineAmount;
    patchBorrowFineUpdate(queryClient, r.recordId, {
      fineAmount: amount,
      displayFineAmount: amount,
      fineStatus: "STAMPED",
    });
  }
}
