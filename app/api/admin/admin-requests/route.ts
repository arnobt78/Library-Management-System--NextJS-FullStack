/**
 * Admin Requests API Route
 *
 * GET /api/admin/admin-requests?scope=pending|decisions
 * - pending (default): PENDING queue for Approve/Decline
 * - decisions: recent APPROVED/REJECTED with reviewer attribution
 *
 * IMPORTANT: Node.js runtime (database access)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getPendingAdminRequests,
  getRecentAdminRequestDecisions,
} from "@/lib/admin/actions/admin-requests";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

/**
 * Get pending or recent-decision admin requests.
 */
export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const scope = request.nextUrl.searchParams.get("scope") ?? "pending";
    const result =
      scope === "decisions"
        ? await getRecentAdminRequestDecisions()
        : await getPendingAdminRequests();

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
