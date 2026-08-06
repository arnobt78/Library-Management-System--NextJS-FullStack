/**
 * Thin densify for user.write — user detail + pending list filters when cached.
 * Leaving PENDING marks densify-empty when the queue becomes [] (soft-nav guard).
 * Re-request (REJECTED→PENDING) upserts pending queue when detail is cached.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  clearDensifiedEmpty,
  markDensifiedEmpty,
} from "@/lib/utils/queryCacheLists";

type UserLike = {
  id: string;
  status?: string;
  role?: string;
  [key: string]: unknown;
};

/** Patch cached user detail after status/role change. */
export function densifyUserWrite(
  queryClient: QueryClient,
  patch: { userId: string; status?: string; role?: string },
): void {
  if (!patch.userId) return;
  const key = queryKeys.users.detail(patch.userId);
  queryClient.setQueryData(key, (prev: unknown) => {
    if (!prev || typeof prev !== "object") return prev;
    return {
      ...(prev as object),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
    };
  });

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
}
