/**
 * Admin Refresh Recommendation Cache API Route
 *
 * POST /api/admin/refresh-recommendation-cache
 *
 * Purpose: Refresh the recommendation cache by clearing and regenerating cached recommendations.
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - cacheCleared: boolean
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshRecommendationCache } from "@/lib/admin/actions/recommendations";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Check if user is admin
    // CRITICAL: Check role from session first (if available from new JWT)
    // If not available, fallback to database check (for existing sessions)
    let isAdmin = false;
    if ((session.user as { role?: string }).role === "ADMIN") {
      isAdmin = true;
    } else {
      // Fallback: Check database if role not in session (for existing sessions)
      // This handles cases where JWT was created before role was added
      const user = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      isAdmin = user[0]?.role === "ADMIN";
    }

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

    const result = await refreshRecommendationCache();

    return NextResponse.json({
      success: true,
      message: result.message,
      cacheCleared: result.cacheCleared,
    });
  } catch (error) {
    console.error("Error refreshing recommendation cache:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to refresh recommendation cache",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
