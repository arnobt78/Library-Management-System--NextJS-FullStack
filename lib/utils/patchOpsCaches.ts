/**
 * Post-invalidate densify for operations.write — reminder / export KPIs.
 * Call via commitMutationCache after invalidate.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { ReminderStats } from "@/lib/services/admin";
import { evictAnalyticsCaches } from "@/lib/utils/evictAnalyticsCaches";

/**
 * Bump remindersSentToday after due/overdue reminder sends.
 * Absolute when full stats provided; otherwise delta from sent count.
 */
export function densifyReminderStats(
  queryClient: QueryClient,
  args: {
    /** Number of reminders sent in this mutation. */
    sentCount?: number;
    /** Full stats replace when API returns them. */
    stats?: ReminderStats | null;
  },
): void {
  const key = queryKeys.admin.reminderStats;
  if (args.stats) {
    queryClient.setQueryData<ReminderStats>(key, args.stats);
    evictAnalyticsCaches(queryClient);
    return;
  }

  const sent = args.sentCount ?? 0;
  if (sent <= 0) {
    evictAnalyticsCaches(queryClient);
    return;
  }

  queryClient.setQueryData<ReminderStats>(key, (old) => {
    if (!old) {
      return {
        dueSoon: 0,
        overdue: 0,
        remindersSentToday: sent,
      };
    }
    return {
      ...old,
      remindersSentToday: Math.max(0, old.remindersSentToday + sent),
    };
  });
  evictAnalyticsCaches(queryClient);
}
