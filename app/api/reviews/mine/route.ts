/**
 * GET /api/reviews/mine — signed-in user's own reviews (any status).
 * Powers the "My Reviews" tab. Parent: CR-0003 / REQ-0034
 */
import { NextResponse } from "next/server";
import { authorizeAuthenticatedRoute } from "@/lib/auth/routeAuthorization";
import { getUserBookReviews } from "@/lib/server/reviewData";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authorization = await authorizeAuthenticatedRoute();
    if (!authorization.ok) return authorization.response;

    const reviews = await getUserBookReviews(authorization.actor.id);
    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}
