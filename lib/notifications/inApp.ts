/**
 * In-app notification creators (bell). Server-only — write path for the
 * `notifications` table consumed by the NotificationBell/Dropdown.
 * Parent: CR-0003 / REQ-0034
 *
 * Every creator is fire-and-forget: a failure here must never fail the
 * caller's primary mutation (ticket/review/admin-request write). Callers
 * should NOT await these in a way that blocks the response — call them
 * after the primary write succeeds and swallow/log failures internally.
 */
import "server-only";

import { db } from "@/database/drizzle";
import { notifications, users } from "@/database/schema";
import { and, count, eq } from "drizzle-orm";

type NotificationType =
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "TICKET_REPLY"
  | "REVIEW_SUBMITTED"
  | "REVIEW_MODERATED"
  | "ADMIN_REQUEST_SUBMITTED"
  | "ADMIN_REQUEST_DECIDED";

interface CreateInAppNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/** Insert a single notification. Never throws — logs and resolves on failure. */
export async function createInAppNotification(
  input: CreateInAppNotificationInput,
): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    });
  } catch (error) {
    console.error("[createInAppNotification] Failed to persist notification:", error);
  }
}

/** Fan-out the same notification to every user in `userIds` (deduped). */
export async function createInAppNotificationForUsers(
  userIds: string[],
  input: Omit<CreateInAppNotificationInput, "userId">,
): Promise<void> {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  try {
    await db.insert(notifications).values(
      uniqueIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
      })),
    );
  } catch (error) {
    console.error(
      "[createInAppNotificationForUsers] Failed to persist notifications:",
      error,
    );
  }
}

/**
 * Unread bell count for `userId`. Read-only counterpart of the API route at
 * `/api/notifications/unread-count` — used by root/admin layouts to SSR-seed
 * `NotificationBell` so the badge paints on first byte instead of a client
 * fetch flash. Kept in sync manually (same WHERE clause); no shared query
 * builder exists yet because the API route also needs the authorization
 * envelope this helper intentionally skips (caller already has the actor).
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return row?.count ?? 0;
}

/** Every ADMIN user's id + email — used when an email fan-out is also needed. */
export async function getAllAdminUsers(
  excludeUserId?: string,
): Promise<{ id: string; email: string }[]> {
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, "ADMIN"));

  return rows.filter((row) => row.id !== excludeUserId);
}
