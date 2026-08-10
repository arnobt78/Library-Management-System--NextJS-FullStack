/**
 * User 360 per-user activity history row (subset of activity_logs).
 */

import { and, eq, or, sql, type SQL } from "drizzle-orm";
import { activityLogs } from "@/database/schema";

export type AdminUserActivityEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  createdAt: Date | string;
  actorId?: string | null;
};

export const USER_ACTIVITY_CACHE_RETENTION = 25;

/**
 * Subject filter aligned with densifyActivityLog / resolveActivitySubjectUserId:
 * actor OR entity=user OR details.userId (admin acting on this user).
 * Does not use actor-only densify fallback (avoids painting admin's own 360).
 */
export function activityHistoryForUserWhere(userId: string): SQL | undefined {
  return or(
    eq(activityLogs.actorId, userId),
    and(
      eq(activityLogs.entityType, "user"),
      eq(activityLogs.entityId, userId),
    ),
    sql`(${activityLogs.details}->>'userId') = ${userId}`,
  );
}
