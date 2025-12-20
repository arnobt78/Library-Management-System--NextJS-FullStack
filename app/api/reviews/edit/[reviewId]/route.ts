import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { bookReviews } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";

export const runtime = "nodejs";

// PUT /api/reviews/edit/[reviewId] - Update a review
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { reviewId } = await params;
    const { rating, comment } = await request.json();

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (!comment || comment.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Comment is required" },
        { status: 400 }
      );
    }

    // Check if review exists and belongs to the user
    const existingReview = await db
      .select()
      .from(bookReviews)
      .where(
        and(
          eq(bookReviews.id, reviewId),
          eq(bookReviews.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingReview.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Review not found or you don't have permission to edit it",
        },
        { status: 404 }
      );
    }

    // Update the review
    const [updatedReview] = await db
      .update(bookReviews)
      .set({
        rating,
        comment: comment.trim(),
        updatedAt: new Date(),
      })
      .where(eq(bookReviews.id, reviewId))
      .returning({
        id: bookReviews.id,
        rating: bookReviews.rating,
        comment: bookReviews.comment,
        updatedAt: bookReviews.updatedAt,
      });

    return NextResponse.json({
      success: true,
      review: updatedReview,
      message: "Review updated successfully",
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update review" },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/delete/[reviewId] - Delete a review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { reviewId } = await params;

    // Check if review exists and belongs to the user
    const existingReview = await db
      .select()
      .from(bookReviews)
      .where(
        and(
          eq(bookReviews.id, reviewId),
          eq(bookReviews.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingReview.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Review not found or you don't have permission to delete it",
        },
        { status: 404 }
      );
    }

    // Delete the review
    await db.delete(bookReviews).where(eq(bookReviews.id, reviewId));

    return NextResponse.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete review" },
      { status: 500 }
    );
  }
}
