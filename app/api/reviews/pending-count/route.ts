/**
 * GET /api/reviews/pending-count — admin sidebar badge (PENDING reviews).
 * Parent: CR-0003 / REQ-0034
 */
import { NextResponse } from "next/server";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { getPendingReviewCount } from "@/lib/server/reviewData";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const count = await getPendingReviewCount();
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Error fetching pending review count:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch review count", count: 0 },
      { status: 500 },
    );
  }
}
