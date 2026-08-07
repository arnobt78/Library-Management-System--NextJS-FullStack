/**
 * Densify helpers for admin-request.write — pending queue + recent decisions.
 * Call AFTER await invalidate via commitMutationCache; mark densify-empty on [].
 */

import type { QueryClient } from "@tanstack/react-query";
import { RECENT_ADMIN_REQUEST_DECISIONS_LIMIT } from "@/lib/admin/adminRequestConstants";
import { queryKeys } from "@/lib/query/keys";
import type { AdminRequest } from "@/lib/services/users";
import {
  clearDensifiedEmpty,
  markDensifiedEmpty,
} from "@/lib/utils/queryCacheLists";
import { patchAdminNavCounts } from "@/lib/utils/patchAdminNavCounts";
import { patchAdminStatsOnAdminRequestStatusChange } from "@/lib/utils/patchAdminStatsCaches";

/** Sync User Management pill when pending make-admin queue is cached. */
export function syncPendingAdminNav(queryClient: QueryClient): void {
  const rows = queryClient.getQueryData<AdminRequest[]>(
    queryKeys.admin.pendingRequests,
  );
  if (!Array.isArray(rows)) return;
  patchAdminNavCounts(queryClient, { pendingAdminRequests: rows.length });
}

/** Upsert a PENDING request into the make-admin pending queue. */
export function densifyAdminRequestCreate(
  queryClient: QueryClient,
  request: AdminRequest,
): void {
  const key = queryKeys.admin.pendingRequests;
  queryClient.setQueryData<AdminRequest[]>(key, (old) => {
    const rows = old ?? [];
    const without = rows.filter((r) => r.id !== request.id);
    return [{ ...request, status: "PENDING" }, ...without];
  });
  clearDensifiedEmpty(key);
  syncPendingAdminNav(queryClient);
  patchAdminStatsOnAdminRequestStatusChange(queryClient, {
    fromStatus: null,
    toStatus: "PENDING",
  });
}

/**
 * Remove a request from pending (cancel / after decide).
 * Pass `overviewWithdraw: true` on applicant cancel so Admins pending badge drops
 * without double-counting when `densifyAdminRequestDecision` also runs.
 */
export function densifyAdminRequestRemovePending(
  queryClient: QueryClient,
  requestId: string,
  options?: { overviewWithdraw?: boolean },
): void {
  const key = queryKeys.admin.pendingRequests;
  queryClient.setQueryData<AdminRequest[]>(key, (old) =>
    old ? old.filter((r) => r.id !== requestId) : old,
  );
  const next = queryClient.getQueryData<AdminRequest[]>(key);
  if (Array.isArray(next) && next.length === 0) {
    markDensifiedEmpty(key);
  }
  syncPendingAdminNav(queryClient);
  if (options?.overviewWithdraw) {
    patchAdminStatsOnAdminRequestStatusChange(queryClient, {
      fromStatus: "PENDING",
      toStatus: null,
    });
  }
}

/**
 * Re-apply reject paint after invalidate: drop pending + prepend recent.
 * Approve path also uses densifyUserWrite for role separately.
 */
export function densifyAdminRequestDecision(
  queryClient: QueryClient,
  request: AdminRequest,
): void {
  densifyAdminRequestRemovePending(queryClient, request.id);

  queryClient.setQueryData<AdminRequest[]>(
    queryKeys.admin.recentRequestDecisions,
    (old) => {
      const without = (old ?? []).filter((r) => r.id !== request.id);
      return [request, ...without].slice(0, RECENT_ADMIN_REQUEST_DECISIONS_LIMIT);
    },
  );

  // Overview Admins card: pending / rejected / approved request badges.
  patchAdminStatsOnAdminRequestStatusChange(queryClient, {
    fromStatus: "PENDING",
    toStatus: request.status,
  });
}
