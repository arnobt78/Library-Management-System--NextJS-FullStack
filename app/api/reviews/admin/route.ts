/**
 * GET /api/reviews/admin — moderation queue (all statuses, all books).
 * Admin-only. Supports `?status=` and `?search=` filters.
 * Parent: CR-0003 / REQ-0034 — Book Review moderation
 */
import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { getAdminBookReviews } from "@/lib/server/reviewData";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search") ?? undefined;

    const reviews = await getAdminBookReviews({
      status:
        status === "PENDING" || status === "APPROVED" || status === "REJECTED"
          ? status
          : undefined,
      search,
    });

    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error("Error fetching admin reviews:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}
