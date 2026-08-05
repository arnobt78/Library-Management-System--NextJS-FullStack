/**
 * GET /api/reviews/admin/[id] — single review detail for admin moderation
 * detail page refetches after mutation. Admin-only.
 * Parent: CR-0003 / REQ-0034 — Book Review moderation
 */
import { NextResponse } from "next/server";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { getAdminReviewDetail } from "@/lib/server/reviewData";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const { id } = await params;
    const review = await getAdminReviewDetail(id);
    if (!review) {
      return NextResponse.json(
        { success: false, error: "Review not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error("Error fetching review detail:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch review" },
      { status: 500 },
    );
  }
}
