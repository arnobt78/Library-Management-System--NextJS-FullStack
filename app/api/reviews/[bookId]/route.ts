import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { bookReviews, books, users, borrowRecords } from "@/database/schema";
import { alias } from "drizzle-orm/pg-core";
import { eq, and, desc, or } from "drizzle-orm";
import { authorizeAuthenticatedRoute } from "@/lib/auth/routeAuthorization";
import { auth } from "@/auth";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { logActivity } from "@/lib/admin/activityLog";
import {
  createInAppNotificationForUsers,
  getAllAdminUsers,
} from "@/lib/notifications/inApp";
import { notifyReviewSubmitted } from "@/lib/email/reviewEmails";
import { reviewContentSchema } from "@/lib/validations/review";
import { getAdminReviewDetail } from "@/lib/server/reviewData";

export const runtime = "nodejs";

// GET /api/reviews/[bookId] - Get all reviews for a book
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns public book reviews (reviews are public data, not user-specific)
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
        { status: 429 },
      );
    }

    const { bookId } = await params;

    if (!bookId) {
      return NextResponse.json(
        {
          success: false,
          error: "Book ID is required",
        },
        { status: 400 },
      );
    }

    // Public book pages only ever show APPROVED reviews, except the viewer's
    // own review (shown instantly at PENDING so authors see their submission —
    // this is display-only; moderation status is unchanged until an admin acts).
    // REJECTED own rows stay hidden from the public book list (visible on My Reviews).
    const session = await auth();
    const viewerId = session?.user?.id;
    const visibilityCondition = viewerId
      ? or(
          eq(bookReviews.status, "APPROVED"),
          and(eq(bookReviews.status, "PENDING"), eq(bookReviews.userId, viewerId)),
        )
      : eq(bookReviews.status, "APPROVED");

    // Moderator join for showcase attribution (name/email/card). Author emails
    // are intentionally omitted — only opaque userId for ownership/avatar seed.
    const moderator = alias(users, "review_moderator_public");
    const reviews = await db
      .select({
        id: bookReviews.id,
        rating: bookReviews.rating,
        comment: bookReviews.comment,
        createdAt: bookReviews.createdAt,
        updatedAt: bookReviews.updatedAt,
        status: bookReviews.status,
        userId: bookReviews.userId,
        userFullName: users.fullName,
        universityCard: users.universityCard,
        reviewedBy: bookReviews.reviewedBy,
        reviewedByName: moderator.fullName,
        reviewedByEmail: moderator.email,
        reviewedByUniversityCard: moderator.universityCard,
        reviewedAt: bookReviews.reviewedAt,
      })
      .from(bookReviews)
      .innerJoin(users, eq(bookReviews.userId, users.id))
      .leftJoin(moderator, eq(bookReviews.reviewedBy, moderator.id))
      .where(and(eq(bookReviews.bookId, bookId), visibilityCondition))
      .orderBy(desc(bookReviews.createdAt));

    return NextResponse.json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reviews",
        message: "Reviews are temporarily unavailable.",
      },
      { status: 500 },
    );
  }
}

// POST /api/reviews/[bookId] - Create a new review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
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
    const { actor } = authorization;

    const { bookId } = await params;

    if (!bookId) {
      return NextResponse.json(
        {
          success: false,
          error: "Book ID is required",
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = reviewContentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Invalid review data",
        },
        { status: 400 },
      );
    }
    const { rating, comment } = parsed.data;

    // Check if user has borrowed this book before (for eligibility)
    const userBorrows = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, actor.id),
          eq(borrowRecords.bookId, bookId),
          eq(borrowRecords.status, "RETURNED"),
        ),
      )
      .limit(1);

    if (userBorrows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "You must have borrowed this book to review it",
        },
        { status: 400 },
      );
    }

    // Check if user already has a review for this book
    const existingReview = await db
      .select()
      .from(bookReviews)
      .where(
        and(eq(bookReviews.userId, actor.id), eq(bookReviews.bookId, bookId)),
      )
      .limit(1);

    if (existingReview.length > 0) {
      return NextResponse.json(
        { success: false, error: "You have already reviewed this book" },
        { status: 400 },
      );
    }

    // Book title for admin notifications (fetched once, best-effort).
    const [bookRow] = await db
      .select({ title: books.title })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    // Create the review — explicitly PENDING; the reviewer sees it immediately
    // via the visibility rule in GET above, but it awaits admin moderation
    // before appearing to other readers.
    const [newReview] = await db
      .insert(bookReviews)
      .values({
        bookId,
        userId: actor.id,
        rating,
        comment: comment.trim(),
        status: "PENDING",
      })
      .returning({
        id: bookReviews.id,
        rating: bookReviews.rating,
        comment: bookReviews.comment,
        status: bookReviews.status,
        createdAt: bookReviews.createdAt,
      });

    revalidateMutationPaths("review.write");

    // Densify payload — full AdminBookReviewItem (book meta + preferred borrow).
    // Fallback to thin returning if detail reload fails (should not happen).
    const fullReview =
      (await getAdminReviewDetail(newReview.id)) ??
      ({
        id: newReview.id,
        rating: newReview.rating,
        comment: newReview.comment,
        status: newReview.status,
        bookId,
        bookTitle: bookRow?.title ?? "Unknown Book",
        bookCoverUrl: null,
        bookCoverColor: null,
        bookAuthor: "",
        bookGenre: "",
        bookRating: 0,
        userId: actor.id,
        userName: actor.name,
        userEmail: actor.email,
        userUniversityCard: null,
        userUniversityId: 0,
        reviewedBy: null,
        reviewedByName: null,
        reviewedByEmail: null,
        reviewedByUniversityCard: null,
        reviewedAt: null,
        createdAt: newReview.createdAt?.toISOString() ?? null,
        updatedAt: newReview.createdAt?.toISOString() ?? null,
        borrowedAt: null,
        dueDate: null,
        returnedAt: null,
      } satisfies AdminBookReviewItem);

    await logActivity({
      actorId: actor.id,
      action: "CREATE",
      entityType: "review",
      entityId: newReview.id,
      details: { bookTitle: bookRow?.title ?? fullReview.bookTitle, rating },
    });

    // Fan out to admins for moderation — fire-and-forget, never blocks the response.
    void (async () => {
      const admins = await getAllAdminUsers(actor.id);
      if (admins.length === 0) return;

      await createInAppNotificationForUsers(
        admins.map((admin) => admin.id),
        {
          type: "REVIEW_SUBMITTED",
          title: "New book review awaiting moderation",
          message: `${actor.name} reviewed "${bookRow?.title ?? fullReview.bookTitle}"`,
          link: `/admin/book-reviews/${newReview.id}`,
        },
      );

      await notifyReviewSubmitted({
        recipients: admins.map((admin) => admin.email),
        reviewerName: actor.name,
        bookTitle: bookRow?.title ?? fullReview.bookTitle,
      });
    })();

    return NextResponse.json({
      success: true,
      review: fullReview,
      message: "Review submitted successfully",
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create review",
        message: "The review could not be created.",
      },
      { status: 500 },
    );
  }
}
