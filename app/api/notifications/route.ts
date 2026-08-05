// Parent: CR-0003 / REQ-0034
// GET /api/notifications - Recent in-app notifications for the signed-in user
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { notifications } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { authorizeAuthenticatedRoute } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeAuthenticatedRoute();
    if (!authorization.ok) return authorization.response;
    const { actor } = authorization;

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);

    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        link: notifications.link,
        isRead: notifications.isRead,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, actor.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return NextResponse.json({ success: true, notifications: rows });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch notifications",
        message: "Notifications are temporarily unavailable.",
      },
      { status: 500 },
    );
  }
}
