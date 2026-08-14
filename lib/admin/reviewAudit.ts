/**
 * Book Review detail Activity — ticket/borrow audit DNA for entityType=review.
 * FIFO-25 (User 360 DNA); global Activity History still retains 50.
 * Parent: review detail KPI cleanup + Activity FIFO-25
 */

import "server-only";

import { db } from "@/database/drizzle";
import { activityLogs, users } from "@/database/schema";
import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { reviewAuditLabel } from "@/lib/admin/reviewAuditLabel";

const activityActor = alias(users, "review_activity_actor");

export { reviewAuditLabel };

/**
 * Activity-log rows for one review (admin detail timeline).
 * Global FIFO-50 may drop older events — still useful for recent moderation writes.
 */
export async function getReviewAuditEvents(
  reviewId: string,
): Promise<TicketActivityEvent[]> {
  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      details: activityLogs.details,
      createdAt: activityLogs.createdAt,
      actorId: activityLogs.actorId,
      actorName: activityActor.fullName,
      actorEmail: activityActor.email,
      actorUniversityCard: activityActor.universityCard,
    })
    .from(activityLogs)
    .leftJoin(activityActor, eq(activityLogs.actorId, activityActor.id))
    .where(
      and(
        eq(activityLogs.entityType, "review"),
        eq(activityLogs.entityId, reviewId),
      ),
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(25);

  return rows.map((row) => {
    const details = (row.details as Record<string, unknown> | null) ?? null;
    const title = typeof details?.title === "string" ? details.title : null;

    return {
      id: row.id,
      kind: "audit" as const,
      at: row.createdAt.toISOString(),
      label: reviewAuditLabel(row.action, details),
      actorId: row.actorId,
      actorName: row.actorName,
      actorEmail: row.actorEmail,
      actorUniversityCard: row.actorUniversityCard ?? null,
      detail: title,
    };
  });
}
