/**
 * Thin densify for user.write — user detail + pending list + all-users rows.
 * Leaving PENDING marks densify-empty when the queue becomes [] (soft-nav guard).
 * Re-request (REJECTED→PENDING) upserts pending queue when detail is cached.
 * Sidebar: absolute sync pendingSignUps + users (books-style) from densified caches.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { UsersListResponse } from "@/lib/services/users";
import {
  clearDensifiedEmpty,
  markDensifiedEmpty,
} from "@/lib/utils/queryCacheLists";
import { patchAdminNavCounts } from "@/lib/utils/patchAdminNavCounts";
import {
  patchAdminStatsOnUserRoleChange,
  patchAdminStatsOnUserStatusChange,
} from "@/lib/utils/patchAdminStatsCaches";

type UserLike = {
  id: string;
  status?: string;
  role?: string;
  [key: string]: unknown;
};

/** Sync Registration Queue pill + overview pending-sign-ups badge from pending cache. */
export function syncPendingSignUpsNav(queryClient: QueryClient): void {
  let found = false;
  let densest = 0;
  for (const [, rows] of queryClient.getQueriesData<UserLike[]>({
    queryKey: queryKeys.users.pendingRoot,
  })) {
    if (!Array.isArray(rows)) continue;
    found = true;
    densest = Math.max(densest, rows.length);
  }
  if (found) {
    patchAdminNavCounts(queryClient, { pendingSignUps: densest });
    // Absolute pendingUsers on overview when signup queue is cached (heals badge drift).
    const stats = queryClient.getQueryData<{
      pendingUsers?: number;
      recentBorrows?: unknown;
      recentUsers?: unknown;
    }>(queryKeys.admin.stats);
    if (
      stats &&
      Array.isArray(stats.recentBorrows) &&
      Array.isArray(stats.recentUsers)
    ) {
      queryClient.setQueryData(queryKeys.admin.stats, {
        ...stats,
        pendingUsers: densest,
      });
    }
  }
}

/** Sync User Management pill fallback from densest cached all-users `total`. */
export function syncUsersNav(queryClient: QueryClient): void {
  let found = false;
  let densest = 0;
  for (const [, page] of queryClient.getQueriesData<UsersListResponse>({
    queryKey: queryKeys.users.adminRoot,
  })) {
    if (!page || typeof page.total !== "number") continue;
    found = true;
    densest = Math.max(densest, page.total);
  }
  if (found) {
    patchAdminNavCounts(queryClient, { users: densest });
  }
}

/** Patch role/status on cached all-users list rows (no invent, no total change). */
function patchAdminUsersListRows(
  queryClient: QueryClient,
  patch: { userId: string; status?: string; role?: string },
): void {
  if (patch.status === undefined && patch.role === undefined) return;

  queryClient.setQueriesData<UsersListResponse>(
    { queryKey: queryKeys.users.adminRoot },
    (old) => {
      if (!old?.users) return old;
      let changed = false;
      const users = old.users.map((u) => {
        if (u.id !== patch.userId) return u;
        changed = true;
        return {
          ...u,
          ...(patch.status !== undefined ? { status: patch.status as typeof u.status } : {}),
          ...(patch.role !== undefined ? { role: patch.role as typeof u.role } : {}),
        };
      });
      return changed ? { ...old, users } : old;
    },
  );
}

/** Patch cached user detail after status/role change. */
export function densifyUserWrite(
  queryClient: QueryClient,
  patch: {
    userId: string;
    status?: string;
    role?: string;
    /** Prior status for overview KPI delta (omit → only bump destination). */
    fromStatus?: string | null;
    reviewer?: {
      id: string;
      fullName: string;
      email: string;
      universityCard: string | null;
    } | null;
    statusReviewedAt?: string | null;
  },
): void {
  if (!patch.userId) return;

  // Prefer explicit fromStatus; else read detail/list before patch
  let fromStatus = patch.fromStatus ?? null;
  let fromRole: string | null = null;
  const detailBefore = queryClient.getQueryData<{
    status?: string;
    role?: string;
  }>(queryKeys.users.detail(patch.userId));
  if (patch.status !== undefined && fromStatus === null) {
    fromStatus = detailBefore?.status ?? null;
    if (!fromStatus) {
      for (const [, page] of queryClient.getQueriesData<UsersListResponse>({
        queryKey: queryKeys.users.adminRoot,
      })) {
        const hit = page?.users?.find((u) => u.id === patch.userId);
        if (hit?.status) {
          fromStatus = hit.status;
          break;
        }
      }
    }
    // Pending queue (before we drop the row) — Account Requests approve path.
    if (!fromStatus) {
      for (const [, rows] of queryClient.getQueriesData<UserLike[]>({
        queryKey: queryKeys.users.pendingRoot,
      })) {
        if (rows?.some((u) => u.id === patch.userId)) {
          fromStatus = "PENDING";
          break;
        }
      }
    }
  }
  if (patch.role !== undefined) {
    fromRole = detailBefore?.role ?? null;
    if (!fromRole) {
      for (const [, page] of queryClient.getQueriesData<UsersListResponse>({
        queryKey: queryKeys.users.adminRoot,
      })) {
        const hit = page?.users?.find((u) => u.id === patch.userId);
        if (hit?.role) {
          fromRole = hit.role;
          break;
        }
      }
    }
  }

  const key = queryKeys.users.detail(patch.userId);
  queryClient.setQueryData(key, (prev: unknown) => {
    if (!prev || typeof prev !== "object") return prev;
    return {
      ...(prev as object),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
    };
  });

  patchAdminUsersListRows(queryClient, patch);

  // Pending queue: drop when leaving PENDING.
  if (patch.status && patch.status !== "PENDING") {
    queryClient.setQueriesData<UserLike[]>(
      { queryKey: queryKeys.users.pendingRoot },
      (old) => (old ? old.filter((u) => u.id !== patch.userId) : old),
    );
    for (const [pendingKey, rows] of queryClient.getQueriesData<UserLike[]>({
      queryKey: queryKeys.users.pendingRoot,
    })) {
      if (Array.isArray(rows) && rows.length === 0) {
        markDensifiedEmpty(pendingKey);
      }
    }
    syncPendingSignUpsNav(queryClient);
  }

  syncUsersNav(queryClient);

  if (patch.status) {
    patchAdminStatsOnUserStatusChange(queryClient, {
      userId: patch.userId,
      fromStatus,
      toStatus: patch.status,
      reviewer: patch.reviewer,
      statusReviewedAt: patch.statusReviewedAt,
    });
  }

  // Overview Admins KPI value (not make-admin request badges).
  if (patch.role !== undefined) {
    patchAdminStatsOnUserRoleChange(queryClient, {
      fromRole,
      toRole: patch.role,
    });
  }
}

/**
 * REJECTED → PENDING re-apply: patch detail + upsert into pending signup queue.
 */
export function densifyUserRegistrationPending(
  queryClient: QueryClient,
  userId: string,
): void {
  if (!userId) return;
  densifyUserWrite(queryClient, { userId, status: "PENDING" });

  const detail = queryClient.getQueryData<UserLike>(
    queryKeys.users.detail(userId),
  );
  const pendingKey = queryKeys.users.pending();
  const row: UserLike = detail
    ? { ...detail, id: userId, status: "PENDING" }
    : { id: userId, status: "PENDING" };

  queryClient.setQueryData<UserLike[]>(pendingKey, (old) => {
    const rows = old ?? [];
    const without = rows.filter((u) => u.id !== userId);
    return [row, ...without];
  });
  clearDensifiedEmpty(pendingKey);
  syncPendingSignUpsNav(queryClient);
  syncUsersNav(queryClient);
}
