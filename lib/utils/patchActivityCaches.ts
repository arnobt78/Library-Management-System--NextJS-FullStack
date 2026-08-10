/**
 * Instant densify for Activity History list caches (FIFO-50 feed).
 * Parent: CR-0003 / REQ-0034
 *
 * Call AFTER `await invalidateMutation(...)` inside commitMutationCache densify
 * so soft-nav to `/admin/activity-history` paints the new row immediately
 * (no stale SSR flash). Server `logActivity` remains the source of truth;
 * invented client rows use provisional ids and reconcile on refetch.
 *
 * Also paints User 360 per-user activity (`user-activity-history`) when the
 * log targets a subject userId (details.userId or entityType user).
 */

import type { QueryClient } from "@tanstack/react-query";
import {
  USER_ACTIVITY_CACHE_RETENTION,
  type AdminUserActivityEntry,
} from "@/lib/admin/adminUserActivity";
import { queryKeys } from "@/lib/query/keys";
import type { ActivityLogItem } from "@/lib/services/activityLogs";

/** Matches server retention in `lib/admin/activityLog.ts`. */
export const ACTIVITY_LOG_CACHE_RETENTION = 50;

/** SSR / Activity History default period key — always seed when cold. */
const DEFAULT_ACTIVITY_LIST_KEY = queryKeys.activityLog.list({
  period: "7days",
});

export type InventActivityLogInput = {
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorUniversityCard?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
};

/** Build a client-side ActivityLogItem for densify prepend. */
export function inventActivityLogItem(
  input: InventActivityLogInput,
): ActivityLogItem {
  return {
    id: `optimistic-activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
    actorUniversityCard: input.actorUniversityCard ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    details: input.details ?? null,
    createdAt: new Date().toISOString(),
  };
}

function prependFifo(
  rows: ActivityLogItem[] | undefined,
  row: ActivityLogItem,
): ActivityLogItem[] {
  const next = [row, ...(rows ?? [])];
  return next.slice(0, ACTIVITY_LOG_CACHE_RETENTION);
}

function prependUserActivityFifo(
  rows: AdminUserActivityEntry[] | undefined,
  row: AdminUserActivityEntry,
): AdminUserActivityEntry[] {
  const without = (rows ?? []).filter((r) => r.id !== row.id);
  return [row, ...without].slice(0, USER_ACTIVITY_CACHE_RETENTION);
}

/** Subject user for User 360 panel — prefer details.userId (admin acting on user). */
export function resolveActivitySubjectUserId(
  input: InventActivityLogInput,
): string | null {
  const fromDetails = input.details?.userId;
  if (typeof fromDetails === "string" && fromDetails.length > 0) {
    return fromDetails;
  }
  if (input.entityType === "user" && input.entityId) {
    return input.entityId;
  }
  return null;
}

/**
 * Densest cached activity list (optional baseline helper for callers that
 * snapshot before invalidate). Invent-prepend densify does not require this.
 */
export function snapshotActivityLogBaselines(
  queryClient: QueryClient,
): ActivityLogItem[] | undefined {
  let densest: ActivityLogItem[] | undefined;
  for (const [, data] of queryClient.getQueriesData<ActivityLogItem[]>({
    queryKey: queryKeys.activityLog.root,
  })) {
    if (!Array.isArray(data)) continue;
    if (!densest || data.length > densest.length) densest = data;
  }
  return densest;
}

/**
 * Prepend an invented activity row to every cached activity-logs list.
 * Also seeds the default `7days` key when no activity query was ever mounted
 * so first soft-nav to Activity History after a mutation is not stale SSR-only.
 */
export function patchActivityCachesOnLog(
  queryClient: QueryClient,
  row: ActivityLogItem,
): void {
  queryClient.setQueriesData<ActivityLogItem[]>(
    { queryKey: queryKeys.activityLog.root },
    (old) => prependFifo(old, row),
  );
  // setQueriesData only updates existing entries — cold tab needs an explicit seed.
  if (queryClient.getQueryData(DEFAULT_ACTIVITY_LIST_KEY) === undefined) {
    queryClient.setQueryData(DEFAULT_ACTIVITY_LIST_KEY, [row]);
  }
}

/** Prepend into User 360 per-user activity cache (cold-seeds when missing). */
export function densifyUserActivityHistory(
  queryClient: QueryClient,
  userId: string,
  row: AdminUserActivityEntry,
): void {
  if (!userId) return;
  const key = queryKeys.activityLog.user(userId);
  queryClient.setQueryData<AdminUserActivityEntry[]>(key, (old) =>
    prependUserActivityFifo(old, row),
  );
}

/** Convenience: invent + prepend admin FIFO + User 360 subject panel. */
export function densifyActivityLog(
  queryClient: QueryClient,
  input: InventActivityLogInput,
): void {
  const item = inventActivityLogItem(input);
  patchActivityCachesOnLog(queryClient, item);

  const subjectUserId = resolveActivitySubjectUserId(input);
  if (subjectUserId) {
    densifyUserActivityHistory(queryClient, subjectUserId, {
      id: item.id,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      details: item.details,
      createdAt: item.createdAt,
      actorId: item.actorId,
    });
  }
}
