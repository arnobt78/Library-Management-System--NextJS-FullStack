/**
 * Admin Requests API Route
 *
 * GET /api/admin/admin-requests
 *
 * Purpose: Get pending admin requests for admin review.
 *
 * Returns:
 * - Array of pending admin requests with user details
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { getPendingAdminRequests } from "@/lib/admin/actions/admin-requests";

export const runtime = "nodejs";

/**
 * Get pending admin requests
 *
 * @param request - Next.js request object
 * @returns JSON response with pending admin requests array
 */
export async function GET(_request: NextRequest) {
  try {
    const result = await getPendingAdminRequests();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to fetch admin requests",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requests: result.data || [],
    });
  } catch (error) {
    console.error("Error fetching admin requests:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch admin requests",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
