"use server";

/**
 * Slim admin User 360 activity loader — same subject filter as profile SSR.
 */

import { desc } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { activityLogs } from "@/database/schema";
import { requireAdminActor } from "@/lib/auth/authorization";
import { parseEntityId } from "@/lib/actionInputs";
import {
  activityHistoryForUserWhere,
  type AdminUserActivityEntry,
} from "@/lib/admin/adminUserActivity";

export async function getAdminUserActivityHistory(
  userId: string,
): Promise<AdminUserActivityEntry[]> {
  await requireAdminActor();
  const id = parseEntityId(userId);

  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      details: activityLogs.details,
      createdAt: activityLogs.createdAt,
      actorId: activityLogs.actorId,
    })
    .from(activityLogs)
    .where(activityHistoryForUserWhere(id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(25);

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details,
    createdAt: row.createdAt,
    actorId: row.actorId,
  }));
}
