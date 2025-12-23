/**
 * Review Eligibility API Route
 *
 * GET /api/reviews/eligibility/[bookId]
 *
 * Purpose: Check if the current user is eligible to review a specific book
 *
 * Business Rules:
 * 1. User must be logged in
 * 2. User must have borrowed the book before (status = RETURNED)
 * 3. User cannot have already reviewed the book (one review per user per book)
 *
 * Returns:
 * - canReview: boolean - Whether user can submit a review
 * - hasExistingReview: boolean - Whether user already reviewed this book
 * - isCurrentlyBorrowed: boolean - Whether user currently has the book borrowed
 * - reason: string - Human-readable explanation
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { bookReviews, borrowRecords } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";

/**
 * Explicitly set runtime to Node.js
 *
 * WHY?
 * - This route uses 'pg' (PostgreSQL client) which requires Node.js runtime
 * - Edge runtime doesn't support Node.js modules like 'crypto', 'fs', etc.
 * - Without this, you'll get "crypto module not supported" errors
 */
export const runtime = "nodejs";

/**
 * Check if user can review a book
 *
 * Eligibility Criteria:
 * 1. User must be authenticated
 * 2. User must have previously borrowed AND returned the book
 * 3. User must not have already reviewed the book
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing bookId
 * @returns JSON response with eligibility status
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns review eligibility status (public information, not sensitive)
    // Rate limiting provides protection against abuse while keeping it accessible for public book pages
    const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 }
      );
    }

    const { bookId } = await params;

    if (!bookId) {
      return NextResponse.json(
        {
          success: false,
          error: "Book ID is required",
        },
        { status: 400 }
      );
    }

    // Check authentication (optional - works for both authenticated and unauthenticated users)
    // If user is not authenticated, return eligibility as false with appropriate reason
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({
        success: true,
        canReview: false,
        hasExistingReview: false,
        isCurrentlyBorrowed: false,
        reason: "Please log in to review books",
      });
    }

    /**
     * Check if user has borrowed this book before (for eligibility)
     *
     * Only counts RETURNED books because:
     * - User needs to have actually read the book to review it
     * - PENDING or BORROWED books don't count (book not yet returned)
     */
    const userBorrows = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, session.user.id),
          eq(borrowRecords.bookId, bookId),
          eq(borrowRecords.status, "RETURNED") // Must have returned the book
        )
      )
      .limit(1);

    /**
     * Check if user currently has this book borrowed (not returned)
     *
     * This is informational - doesn't affect eligibility
     * Used to show different UI messages (e.g., "Return book to review")
     */
    const currentBorrow = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, session.user.id),
          eq(borrowRecords.bookId, bookId),
          eq(borrowRecords.status, "BORROWED") // Currently borrowed
        )
      )
      .limit(1);

    /**
     * Check if user already has a review for this book
     *
     * Business rule: One review per user per book
     * Prevents spam and ensures quality reviews
     */
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

    // Calculate eligibility
    const hasExistingReview = existingReview.length > 0;
    const canReview = userBorrows.length > 0 && !hasExistingReview; // Must have borrowed AND not already reviewed
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
      {
        success: false,
        error: "Failed to check review eligibility",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
