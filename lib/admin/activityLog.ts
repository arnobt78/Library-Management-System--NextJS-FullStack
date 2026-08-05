/**
 * Admin activity audit log (fire-and-forget writer).
 * Parent: CR-0003 / REQ-0034
 *
 * Every mutation call site (book/user/borrow/review/ticket/admin-request)
 * calls `logActivity()` after its primary write succeeds. This must never
 * throw into the caller — failures are swallowed and logged server-side so
 * the audit trail can never break a real user-facing mutation.
 *
 * Retention: FIFO, latest 50 rows kept (matches stock-inventory's audit log
 * cadence). Cleanup runs inline after each insert — cheap at this volume and
 * avoids needing a cron/queue for a purely advisory admin feed.
 */
import "server-only";

import { db } from "@/database/drizzle";
import { activityLogs } from "@/database/schema";
import { desc, notInArray } from "drizzle-orm";

const ACTIVITY_LOG_RETENTION = 50;
const LOG_TEXT_MAX_LENGTH = 120;

/**
 * Bound a free-text user input (e.g. ticket subject) before it's persisted
 * into a `details` JSON blob on the activity log. Call sites should use this
 * for any field sourced from user-supplied text, not just fixed enums/ids.
 */
export function truncateForLog(
  text: string,
  max: number = LOG_TEXT_MAX_LENGTH,
): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

type ActivityLogAction = "CREATE" | "UPDATE" | "DELETE";

type ActivityLogEntityType =
  | "book"
  | "user"
  | "borrow"
  | "review"
  | "ticket"
  | "admin-request"
  | "reservation";

interface LogActivityInput {
  /** Server-derived actor id only — never trust a client-supplied value. */
  actorId: string | null;
  action: ActivityLogAction;
  entityType: ActivityLogEntityType;
  entityId?: string | null;
  /** Small structured context (e.g. { title, from, to }) — no secrets/PII blobs. */
  details?: Record<string, unknown> | null;
}

/** Insert one activity row, then trim the table down to the latest 50. Never throws. */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details ?? null,
    });

    const stale = await db
      .select({ id: activityLogs.id })
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(ACTIVITY_LOG_RETENTION);

    if (stale.length === ACTIVITY_LOG_RETENTION) {
      await db
        .delete(activityLogs)
        .where(
          notInArray(
            activityLogs.id,
            stale.map((row) => row.id),
          ),
        );
    }
  } catch (error) {
    console.error("[logActivity] Failed to persist activity log:", error);
  }
}