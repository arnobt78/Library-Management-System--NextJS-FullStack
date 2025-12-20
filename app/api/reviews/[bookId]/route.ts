import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { bookReviews, users, borrowRecords } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";

export const runtime = "nodejs";

// GET /api/reviews/[bookId] - Get all reviews for a book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;

    const reviews = await db
      .select({
        id: bookReviews.id,
        rating: bookReviews.rating,
        comment: bookReviews.comment,
        createdAt: bookReviews.createdAt,
        updatedAt: bookReviews.updatedAt,
        userFullName: users.fullName,
        userEmail: users.email,
      })
      .from(bookReviews)
      .innerJoin(users, eq(bookReviews.userId, users.id))
      .where(eq(bookReviews.bookId, bookId))
      .orderBy(desc(bookReviews.createdAt));

    return NextResponse.json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST /api/reviews/[bookId] - Create a new review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { bookId } = await params;
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

    if (userBorrows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "You must have borrowed this book to review it",
        },
        { status: 400 }
      );
    }

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

    if (existingReview.length > 0) {
      return NextResponse.json(
        { success: false, error: "You have already reviewed this book" },
        { status: 400 }
      );
    }

    // Create the review
    const [newReview] = await db
      .insert(bookReviews)
      .values({
        bookId,
        userId: session.user.id,
        rating,
        comment: comment.trim(),
      })
      .returning({
        id: bookReviews.id,
        rating: bookReviews.rating,
        comment: bookReviews.comment,
        createdAt: bookReviews.createdAt,
      });

    return NextResponse.json({
      success: true,
      review: newReview,
      message: "Review submitted successfully",
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create review" },
      { status: 500 }
    );
  }
}
