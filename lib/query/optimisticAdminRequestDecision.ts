/**
 * Optimistic make-admin request cache updates:
 * remove from pending queue + prepend Recent decisions so UI paints before refetch.
 * Server ledger + await invalidateMutation("admin-request.write") remains source of truth.
 *
 * reviewer MUST come from the logged-in admin session — null would flash “an admin”.
 * Last-item empty pending is densify-empty-marked so soft-nav cannot SSR-reseed.
 */

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { RECENT_ADMIN_REQUEST_DECISIONS_LIMIT } from "@/lib/admin/adminRequestConstants";
import { queryKeys } from "@/lib/query/keys";
import type { AdminRequest } from "@/lib/services/users";
import { markDensifiedEmpty } from "@/lib/utils/queryCacheLists";

export type AdminRequestDecisionOptimisticContext = {
  previousPending: Array<[QueryKey, AdminRequest[] | undefined]>;
  previousDecisions: Array<[QueryKey, AdminRequest[] | undefined]>;
};

function findCachedPendingRequest(
  queryClient: QueryClient,
  requestId: string,
): AdminRequest | undefined {
  const pending = queryClient.getQueryData<AdminRequest[]>(
    queryKeys.admin.pendingRequests,
  );
  const hit = pending?.find((r) => r.id === requestId);
  if (hit) return hit;

  for (const [, data] of queryClient.getQueriesData<AdminRequest[]>({
    queryKey: queryKeys.admin.requestsRoot,
  })) {
    const row = data?.find((r) => r.id === requestId);
    if (row) return row;
  }
  return undefined;
}

/**
 * Cancel pending + decisions queries, snapshot for rollback, apply optimistic paint.
 */
export async function applyOptimisticAdminRequestDecision(
  queryClient: QueryClient,
  args: {
    requestId: string;
    status: "APPROVED" | "REJECTED";
    userName?: string;
    rejectionReason?: string | null;
    /** Logged-in admin — avoids “an admin” flash before ledger refetch. */
    reviewer?: AdminRequestReviewer | null;
  },
): Promise<AdminRequestDecisionOptimisticContext> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: queryKeys.admin.pendingRequests }),
    queryClient.cancelQueries({
      queryKey: queryKeys.admin.recentRequestDecisions,
    }),
  ]);

  const previousPending = queryClient.getQueriesData<AdminRequest[]>({
    queryKey: queryKeys.admin.pendingRequests,
  });
  const previousDecisions = queryClient.getQueriesData<AdminRequest[]>({
    queryKey: queryKeys.admin.recentRequestDecisions,
  });

  const cached = findCachedPendingRequest(queryClient, args.requestId);
  const reviewedAt = new Date();
  const optimistic: AdminRequest = {
    id: cached?.id ?? args.requestId,
    userId: cached?.userId ?? "",
    userEmail: cached?.userEmail ?? "",
    userFullName: cached?.userFullName ?? args.userName ?? "User",
    userUniversityCard: cached?.userUniversityCard ?? null,
    requestReason: cached?.requestReason ?? "",
    status: args.status,
    reviewedBy: args.reviewer?.id ?? cached?.reviewedBy ?? null,
    reviewedAt,
    rejectionReason:
      args.status === "REJECTED"
        ? (args.rejectionReason ?? cached?.rejectionReason ?? null)
        : null,
    createdAt: cached?.createdAt ?? reviewedAt,
    updatedAt: reviewedAt,
    reviewer: args.reviewer ?? null,
  };

  queryClient.setQueryData<AdminRequest[]>(
    queryKeys.admin.pendingRequests,
    (old) => (old ? old.filter((r) => r.id !== args.requestId) : old),
  );

  const nextPending = queryClient.getQueryData<AdminRequest[]>(
    queryKeys.admin.pendingRequests,
  );
  if (Array.isArray(nextPending) && nextPending.length === 0) {
    markDensifiedEmpty(queryKeys.admin.pendingRequests);
  }

  queryClient.setQueryData<AdminRequest[]>(
    queryKeys.admin.recentRequestDecisions,
    (old) => {
      const without = (old ?? []).filter((r) => r.id !== args.requestId);
      return [optimistic, ...without].slice(
        0,
        RECENT_ADMIN_REQUEST_DECISIONS_LIMIT,
      );
    },
  );

  return { previousPending, previousDecisions };
}

/** Restore pending + decisions snapshots after a failed approve/reject. */
export function rollbackOptimisticAdminRequestDecision(
  queryClient: QueryClient,
  context: AdminRequestDecisionOptimisticContext | undefined,
): void {
  context?.previousPending?.forEach(([key, data]) => {
    queryClient.setQueryData(key, data);
  });
  context?.previousDecisions?.forEach(([key, data]) => {
    queryClient.setQueryData(key, data);
  });
}
