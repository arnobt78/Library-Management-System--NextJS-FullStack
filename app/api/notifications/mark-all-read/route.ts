// Parent: CR-0003 / REQ-0034
// POST /api/notifications/mark-all-read - Bulk mark-as-read for the bell "Mark all read" action
import { NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { notifications } from "@/database/schema";
import { and, eq } from "drizzle-orm";
import { authorizeAuthenticatedRoute } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

export async function POST() {
  try {
    const authorization = await authorizeAuthenticatedRoute();
    if (!authorization.ok) return authorization.response;
    const { actor } = authorization;

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(eq(notifications.userId, actor.id), eq(notifications.isRead, false)),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update notifications",
        message: "Notifications could not be updated.",
      },
      { status: 500 },
    );
  }
}
