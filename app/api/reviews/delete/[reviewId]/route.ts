import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { bookReviews } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { authorizeAuthenticatedRoute } from "@/lib/auth/routeAuthorization";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";

export const runtime = "nodejs";

// DELETE /api/reviews/delete/[reviewId] - Delete a review
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 },
      );
    }

    const authorization = await authorizeAuthenticatedRoute();
    if (!authorization.ok) return authorization.response;

    const { reviewId } = await params;

    if (!reviewId) {
      return NextResponse.json(
        {
          success: false,
          error: "Review ID is required",
        },
        { status: 400 },
      );
    }

    // CRITICAL: Authorization check - user must own the review to delete it
    // Check if review exists and belongs to the user
    const existingReview = await db
      .select()
      .from(bookReviews)
      .where(
        and(
          eq(bookReviews.id, reviewId),
          eq(bookReviews.userId, authorization.actor.id),
        ),
      )
      .limit(1);

    if (existingReview.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Review not found or you don't have permission to delete it",
          message: "Review not found or you don't have permission to delete it",
        },
        { status: 404 },
      );
    }

    // Delete the review
    await db.delete(bookReviews).where(eq(bookReviews.id, reviewId));

    revalidateMutationPaths("review.write");
    return NextResponse.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete review",
        message: "The review could not be deleted.",
      },
      { status: 500 },
    );
  }
}
