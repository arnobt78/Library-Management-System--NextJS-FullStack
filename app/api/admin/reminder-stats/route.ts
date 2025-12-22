/**
 * Admin Reminder Statistics API Route
 *
 * GET /api/admin/reminder-stats
 *
 * Purpose: Get reminder statistics for the admin automation dashboard.
 *
 * Returns:
 * - dueSoon: Number of books due soon (within 2 days)
 * - overdue: Number of overdue books
 * - remindersSentToday: Number of reminders sent today
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { getReminderStats } from "@/lib/admin/actions/reminders";

export const runtime = "nodejs";

/**
 * Get reminder statistics
 *
 * @param _request - Next.js request object
 * @returns JSON response with reminder statistics
 */
export async function GET(_request: NextRequest) {
  try {
    const stats = await getReminderStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching reminder stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reminder statistics",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

