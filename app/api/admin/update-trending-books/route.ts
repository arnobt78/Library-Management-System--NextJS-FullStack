/**
 * Admin Update Trending Books API Route
 *
 * POST /api/admin/update-trending-books
 *
 * Purpose: Update trending books data based on recent borrowing activity.
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - trendingCount: number
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { updateTrendingBooks } from "@/lib/admin/actions/recommendations";
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
    let isAdmin = false;
    if (session.user.role === "ADMIN") {
      isAdmin = true;
    } else {
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

    const result = await updateTrendingBooks();

    return NextResponse.json({
      success: true,
      message: result.message,
      trendingCount: result.trendingCount,
    });
  } catch (error) {
    console.error("Error updating trending books:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update trending books",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

