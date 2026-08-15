// Parent: CR-0003 / REQ-0034
// GET /api/notifications/total-count - Total notification count for the bell header
import { NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { notifications } from "@/database/schema";
import { eq, count } from "drizzle-orm";
import { authorizeAuthenticatedRoute } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authorization = await authorizeAuthenticatedRoute();
    if (!authorization.ok) return authorization.response;
    const { actor } = authorization;

    const [row] = await db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.userId, actor.id));

    return NextResponse.json({ success: true, count: row?.count ?? 0 });
  } catch (error) {
    console.error("Error fetching total notification count:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch total count",
        message: "Total count is temporarily unavailable.",
      },
      { status: 500 },
    );
  }
}
