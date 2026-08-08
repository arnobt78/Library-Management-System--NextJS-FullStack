/**
 * Evict business-insights / analytics query caches after mutations that
 * invalidate those domains. Soft-nav must remount-refetch — we do not invent
 * chart time-series densify payloads.
 *
 * Call from densify tails of book/borrow/user/fine/ops/recommendation writes.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";

/** Drop cached insights/analytics so remount cannot paint pre-mutation charts. */
export function evictAnalyticsCaches(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: queryKeys.admin.businessInsightsRoot });
  queryClient.removeQueries({ queryKey: queryKeys.admin.analyticsRoot });
  queryClient.removeQueries({ queryKey: queryKeys.admin.analytics });
}
