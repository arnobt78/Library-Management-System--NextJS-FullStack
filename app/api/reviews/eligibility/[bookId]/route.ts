import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { bookReviews, borrowRecords } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";

export const runtime = "nodejs";

// GET /api/reviews/eligibility/[bookId] - Check if user can review a book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({
        success: true,
        canReview: false,
        hasExistingReview: false,
        reason: "Please log in to review books",
      });
    }

    const { bookId } = await params;

    // Check if user has borrowed this book before (for eligibility)
    const userBorrows = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, session.user.id),
          eq(borrowRecords.bookId, bookId),
          eq(borrowRecords.status, "RETURNED")
        )
      )
      .limit(1);

    // Check if user currently has this book borrowed (not returned)
    const currentBorrow = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, session.user.id),
          eq(borrowRecords.bookId, bookId),
          eq(borrowRecords.status, "BORROWED")
        )
      )
      .limit(1);

    // Check if user already has a review for this book
    const existingReview = await db
      .select()
      .from(bookReviews)
      .where(
        and(
          eq(bookReviews.userId, session.user.id),
          eq(bookReviews.bookId, bookId)
        )
      )
      .limit(1);

    const hasExistingReview = existingReview.length > 0;
    const canReview = userBorrows.length > 0 && !hasExistingReview;
    const isCurrentlyBorrowed = currentBorrow.length > 0;

    return NextResponse.json({
      success: true,
      canReview,
      hasExistingReview,
      isCurrentlyBorrowed,
      reason: hasExistingReview
        ? "You have already reviewed this book"
        : userBorrows.length === 0
          ? "You must have borrowed this book to review it"
          : "You can review this book",
    });
  } catch (error) {
    console.error("Error checking review eligibility:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check review eligibility" },
      { status: 500 }
    );
  }
}
