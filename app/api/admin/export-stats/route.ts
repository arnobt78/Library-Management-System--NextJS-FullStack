/**
 * Admin Export Statistics API Route
 *
 * GET /api/admin/export-stats
 *
 * Purpose: Get export statistics for the admin automation dashboard.
 *
 * Returns:
 * - totalBooks: Total number of books
 * - totalUsers: Total number of users
 * - totalBorrows: Total number of borrow records
 * - lastExportDate: Last export date (ISO string)
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { getExportStats } from "@/lib/admin/actions/data-export";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * Get export statistics
 *
 * @param _request - Next.js request object
 * @returns JSON response with export statistics
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    // Check if user is authenticated
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

    const stats = await getExportStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching export stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch export statistics",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
