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

export const runtime = "nodejs";

/**
 * Get export statistics
 *
 * @param _request - Next.js request object
 * @returns JSON response with export statistics
 */
export async function GET(_request: NextRequest) {
  try {
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

