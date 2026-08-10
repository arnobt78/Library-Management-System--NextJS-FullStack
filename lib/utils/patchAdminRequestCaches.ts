/**
 * Densify helpers for admin-request.write — pending queue + recent decisions.
 * Call AFTER await invalidate via commitMutationCache; mark densify-empty on [].
 */

import type { QueryClient } from "@tanstack/react-query";
import { RECENT_ADMIN_REQUEST_DECISIONS_LIMIT } from "@/lib/admin/adminRequestConstants";
import {
  adminRequestToPrivilegeHistoryEntry,
  type AdminPrivilegeHistoryEntry,
} from "@/lib/admin/adminPrivilegeHistory";
import type { LatestAdminRequestStatus } from "@/lib/admin/adminPrivilegeStatus";
import { queryKeys } from "@/lib/query/keys";
import type { AdminRequest, User, UsersListResponse } from "@/lib/services/users";
import {
  clearDensifiedEmpty,
  markDensifiedEmpty,
} from "@/lib/utils/queryCacheLists";
import { patchAdminNavCounts } from "@/lib/utils/patchAdminNavCounts";
import { patchAdminStatsOnAdminRequestStatusChange } from "@/lib/utils/patchAdminStatsCaches";

/** Upsert User 360 privilege history row (newest-first). No-op if cache cold. */
export function densifyAdminPrivilegeHistoryUpsert(
  queryClient: QueryClient,
  userId: string,
  entry: AdminPrivilegeHistoryEntry,
): void {
  if (!userId) return;
  const key = queryKeys.users.adminPrivilegeHistory(userId);
  queryClient.setQueryData<AdminPrivilegeHistoryEntry[]>(key, (old) => {
    if (!old) {
      // Cold seed so soft-nav after mutation still paints the row.
      return [entry];
    }
    const without = old.filter((r) => r.id !== entry.id);
    return [entry, ...without];
  });
}

/** Drop a privilege history row (cancel pending). */
export function densifyAdminPrivilegeHistoryRemove(
  queryClient: QueryClient,
  userId: string,
  requestId: string,
): void {
  if (!userId) return;
  const key = queryKeys.users.adminPrivilegeHistory(userId);
  queryClient.setQueryData<AdminPrivilegeHistoryEntry[]>(key, (old) =>
    old ? old.filter((r) => r.id !== requestId) : old,
  );
}

/**
 * Paint pendingAdminRequestId + latestAdminRequestStatus on all-users + users.detail
 * (Admin privilege KPI + Users kebab CTAs).
 */
export function patchUsersAdminPrivilegeFields(
  queryClient: QueryClient,
  args: {
    userId: string;
    pendingAdminRequestId: string | null;
    latestAdminRequestStatus?: LatestAdminRequestStatus | null;
  },
): void {
  const patchUser = (u: User): User => {
    const next: User = {
      ...u,
      pendingAdminRequestId: args.pendingAdminRequestId,
    };
    if (args.latestAdminRequestStatus !== undefined) {
      next.latestAdminRequestStatus = args.latestAdminRequestStatus;
    }
    return next;
  };

  queryClient.setQueriesData<UsersListResponse>(
    { queryKey: queryKeys.users.adminRoot },
    (old) => {
      if (!old?.users) return old;
      let changed = false;
      const users = old.users.map((u) => {
        if (u.id !== args.userId) return u;
        const next = patchUser(u);
        if (
          u.pendingAdminRequestId === next.pendingAdminRequestId &&
          u.latestAdminRequestStatus === next.latestAdminRequestStatus
        ) {
          return u;
        }
        changed = true;
        return next;
      });
      return changed ? { ...old, users } : old;
    },
  );

  const detailKey = queryKeys.users.detail(args.userId);
  queryClient.setQueryData<User>(detailKey, (old) => {
    if (!old) return old;
    const next = patchUser(old);
    if (
      old.pendingAdminRequestId === next.pendingAdminRequestId &&
      old.latestAdminRequestStatus === next.latestAdminRequestStatus
    ) {
      return old;
    }
    return next;
  });
}

/** Pending-id-only wrapper for cancel paths that omit latest status. */
export function patchUsersPendingAdminRequestId(
  queryClient: QueryClient,
  args: { userId: string; pendingAdminRequestId: string | null },
): void {
  patchUsersAdminPrivilegeFields(queryClient, args);
}

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
  patchUsersAdminPrivilegeFields(queryClient, {
    userId: request.userId,
    pendingAdminRequestId: request.id,
    latestAdminRequestStatus: "PENDING",
  });
  densifyAdminPrivilegeHistoryUpsert(
    queryClient,
    request.userId,
    adminRequestToPrivilegeHistoryEntry({ ...request, status: "PENDING" }),
  );
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
  options?: {
    overviewWithdraw?: boolean;
    userId?: string;
    /** When canceling without a decision, clear latest status too. */
    clearLatestStatus?: boolean;
  },
): void {
  const key = queryKeys.admin.pendingRequests;
  const prior = queryClient.getQueryData<AdminRequest[]>(key);
  const matched = prior?.find((r) => r.id === requestId);
  const userId = options?.userId ?? matched?.userId;

  queryClient.setQueryData<AdminRequest[]>(key, (old) =>
    old ? old.filter((r) => r.id !== requestId) : old,
  );
  const next = queryClient.getQueryData<AdminRequest[]>(key);
  if (Array.isArray(next) && next.length === 0) {
    markDensifiedEmpty(key);
  }
  syncPendingAdminNav(queryClient);
  if (userId) {
    patchUsersAdminPrivilegeFields(queryClient, {
      userId,
      pendingAdminRequestId: null,
      ...(options?.clearLatestStatus
        ? { latestAdminRequestStatus: null }
        : {}),
    });
    if (options?.clearLatestStatus) {
      densifyAdminPrivilegeHistoryRemove(queryClient, userId, requestId);
    }
  }
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
  densifyAdminRequestRemovePending(queryClient, request.id, {
    userId: request.userId,
  });
  patchUsersAdminPrivilegeFields(queryClient, {
    userId: request.userId,
    pendingAdminRequestId: null,
    latestAdminRequestStatus:
      request.status === "APPROVED" || request.status === "REJECTED"
        ? request.status
        : null,
  });
  densifyAdminPrivilegeHistoryUpsert(
    queryClient,
    request.userId,
    adminRequestToPrivilegeHistoryEntry(request),
  );

  queryClient.setQueryData(
    queryKeys.admin.requestDetail(request.id),
    request,
  );

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

/**
 * All Users Make Admin (direct grant or settle pending) — drop user's PENDING
 * queue rows, prepend APPROVED ledger row, sync overview badges.
 */
export function densifyAdminDirectGrant(
  queryClient: QueryClient,
  request: AdminRequest,
): void {
  const pendingKey = queryKeys.admin.pendingRequests;
  const pending = queryClient.getQueryData<AdminRequest[]>(pendingKey);
  const hadPending = Boolean(
    pending?.some((r) => r.userId === request.userId || r.id === request.id),
  );
  if (Array.isArray(pending)) {
    queryClient.setQueryData(
      pendingKey,
      pending.filter((r) => r.userId !== request.userId && r.id !== request.id),
    );
    const next = queryClient.getQueryData<AdminRequest[]>(pendingKey);
    if (Array.isArray(next) && next.length === 0) {
      markDensifiedEmpty(pendingKey);
    }
    syncPendingAdminNav(queryClient);
  }
  patchUsersAdminPrivilegeFields(queryClient, {
    userId: request.userId,
    pendingAdminRequestId: null,
    latestAdminRequestStatus: "APPROVED",
  });
  densifyAdminPrivilegeHistoryUpsert(
    queryClient,
    request.userId,
    adminRequestToPrivilegeHistoryEntry(request),
  );

  queryClient.setQueryData<AdminRequest[]>(
    queryKeys.admin.recentRequestDecisions,
    (old) => {
      const without = (old ?? []).filter((r) => r.id !== request.id);
      return [request, ...without].slice(0, RECENT_ADMIN_REQUEST_DECISIONS_LIMIT);
    },
  );

  patchAdminStatsOnAdminRequestStatusChange(queryClient, {
    fromStatus: hadPending ? "PENDING" : null,
    toStatus: "APPROVED",
  });
}

/**
 * Remove Admin — prepend REJECTED/revoked ledger row into Recent decisions.
 */
export function densifyAdminPrivilegeRevoke(
  queryClient: QueryClient,
  request: AdminRequest,
): void {
  queryClient.setQueryData<AdminRequest[]>(
    queryKeys.admin.recentRequestDecisions,
    (old) => {
      const without = (old ?? []).filter((r) => r.id !== request.id);
      return [request, ...without].slice(0, RECENT_ADMIN_REQUEST_DECISIONS_LIMIT);
    },
  );
  patchUsersAdminPrivilegeFields(queryClient, {
    userId: request.userId,
    pendingAdminRequestId: null,
    latestAdminRequestStatus: "REJECTED",
  });
  densifyAdminPrivilegeHistoryUpsert(
    queryClient,
    request.userId,
    adminRequestToPrivilegeHistoryEntry(request),
  );
  patchAdminStatsOnAdminRequestStatusChange(queryClient, {
    fromStatus: "APPROVED",
    toStatus: "REJECTED",
  });
}
