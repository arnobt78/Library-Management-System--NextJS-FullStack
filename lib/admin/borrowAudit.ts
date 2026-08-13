/**
 * Borrow Queue detail Activity — ticket audit DNA for entityType=borrow.
 * Parent: borrow detail gaps + record/history DNA
 */

import { db } from "@/database/drizzle";
import { activityLogs, users } from "@/database/schema";
import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const activityActor = alias(users, "borrow_activity_actor");

/**
 * Activity-log rows for one borrow record (admin detail timeline).
 * Global FIFO-50 may drop older events — still useful for recent lifecycle writes.
 */
export async function getBorrowAuditEvents(
  recordId: string,
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
        eq(activityLogs.entityType, "borrow"),
        eq(activityLogs.entityId, recordId),
      ),
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(40);

  return rows.map((row) => {
    const details = (row.details as Record<string, unknown> | null) ?? null;
    const status =
      typeof details?.status === "string" ? details.status : null;
    const title = typeof details?.title === "string" ? details.title : null;

    let label = "Borrow updated";
    if (row.action === "CREATE") label = "Borrow request created";
    else if (row.action === "DELETE") label = "Borrow record deleted";
    else if (status === "BORROWED") label = "Status → Borrowed";
    else if (status === "RETURNED") label = "Status → Returned";
    else if (status === "CANCELLED") label = "Status → Cancelled";
    else if (status === "PENDING") label = "Status → Pending";
    else if (status)
      label = `Status → ${String(status).split("_").join(" ")}`;

    return {
      id: row.id,
      kind: "audit" as const,
      at: row.createdAt.toISOString(),
      label,
      actorId: row.actorId,
      actorName: row.actorName,
      actorEmail: row.actorEmail,
      actorUniversityCard: row.actorUniversityCard ?? null,
      detail: title,
    };
  });
}
