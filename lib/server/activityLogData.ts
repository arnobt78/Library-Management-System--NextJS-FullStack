/**
 * Activity History read path (SSR page + `/api/activity-logs` refetches).
 * Parent: CR-0003 / REQ-0034
 *
 * Plain server-only module (no "use server" pragma) so it can be imported by
 * both the RSC page (`app/admin/activity-history/page.tsx`) and the Route
 * Handler used for client-side period/search refetches.
 */
import "server-only";

import { db } from "@/database/drizzle";
import { activityLogs, users } from "@/database/schema";
import { and, desc, eq, gte, ilike, or } from "drizzle-orm";

export type ActivityLogPeriod = "today" | "7days" | "30days" | "all";

export interface ActivityLogRow {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

function resolvePeriodStart(period: ActivityLogPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "7days":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30days":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return null;
  }
}

interface GetActivityLogsOptions {
  period?: ActivityLogPeriod;
  search?: string;
  /** FIFO retention keeps at most 50 rows total; default page fetches all of them. */
  limit?: number;
}

export async function getActivityLogs(
  options: GetActivityLogsOptions = {},
): Promise<ActivityLogRow[]> {
  const { period = "7days", search, limit = 50 } = options;
  const periodStart = resolvePeriodStart(period);
  const trimmedSearch = search?.trim();

  const conditions = [
    periodStart ? gte(activityLogs.createdAt, periodStart) : undefined,
    trimmedSearch
      ? or(
          ilike(activityLogs.action, `%${trimmedSearch}%`),
          ilike(activityLogs.entityType, `%${trimmedSearch}%`),
          ilike(users.fullName, `%${trimmedSearch}%`),
          ilike(users.email, `%${trimmedSearch}%`),
        )
      : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({
      id: activityLogs.id,
      actorId: activityLogs.actorId,
      actorName: users.fullName,
      actorEmail: users.email,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      details: activityLogs.details,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.actorId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    details: (row.details as Record<string, unknown> | null) ?? null,
  }));
}