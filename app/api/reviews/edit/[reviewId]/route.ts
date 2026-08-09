import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { bookReviews, books, users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { authorizeAuthenticatedRoute } from "@/lib/auth/routeAuthorization";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { logActivity } from "@/lib/admin/activityLog";
import {
  createInAppNotification,
  createInAppNotificationForUsers,
  getAllAdminUsers,
} from "@/lib/notifications/inApp";
import { notifyReviewModerated, notifyReviewSubmitted } from "@/lib/email/reviewEmails";
import { moderateReviewSchema, reviewContentSchema } from "@/lib/validations/review";

export const runtime = "nodejs";

/**
 * PUT /api/reviews/edit/[reviewId]
 * - Author (owner): rating/comment edit (existing behavior, any status)
 * - Admin: status moderation (APPROVED/REJECTED) — stamps reviewedBy/reviewedAt
 *   and notifies the author. The two capabilities are mutually exclusive per
 *   request body; a body may only contain the fields its role is allowed to set.
 * Parent: CR-0003 / REQ-0034 — Book Review moderation
 */
export async function PUT(
  request: NextRequest,
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
    const { actor } = authorization;

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

    const body: unknown = await request.json();
    const isModerationPayload =
      typeof body === "object" && body !== null && "status" in body;

    const [existingReview] = await db
      .select({
        id: bookReviews.id,
        userId: bookReviews.userId,
        bookId: bookReviews.bookId,
        status: bookReviews.status,
      })
      .from(bookReviews)
      .where(eq(bookReviews.id, reviewId))
      .limit(1);

    if (!existingReview) {
      return NextResponse.json(
        {
          success: false,
          error: "Review not found",
          message: "Review not found",
        },
        { status: 404 },
      );
    }

    // Admin moderation path — status only, no content edit here.
    if (isModerationPayload) {
      if (actor.role !== "ADMIN") {
        return NextResponse.json(
          { success: false, error: "Only an admin can moderate a review" },
          { status: 403 },
        );
      }
      const parsed = moderateReviewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Status must be APPROVED or REJECTED",
          },
          { status: 400 },
        );
      }
      const { status } = parsed.data;

      const [updatedReview] = await db
        .update(bookReviews)
        .set({ status, reviewedBy: actor.id, reviewedAt: new Date() })
        .where(eq(bookReviews.id, reviewId))
        .returning({
          id: bookReviews.id,
          status: bookReviews.status,
          reviewedAt: bookReviews.reviewedAt,
          reviewedBy: bookReviews.reviewedBy,
        });

      // Moderator display fields for client densify (avoid "an admin" when
      // useSession is null — e.g. cold SessionProvider / incognito lag).
      const [moderator] = await db
        .select({
          fullName: users.fullName,
          email: users.email,
          universityCard: users.universityCard,
        })
        .from(users)
        .where(eq(users.id, actor.id))
        .limit(1);

      revalidateMutationPaths("review.write");

      await logActivity({
        actorId: actor.id,
        action: "UPDATE",
        entityType: "review",
        entityId: reviewId,
        details: { status },
      });

      // Notify the author — fire-and-forget.
      void (async () => {
        const [book] = await db
          .select({ title: books.title })
          .from(books)
          .where(eq(books.id, existingReview.bookId))
          .limit(1);
        const [author] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, existingReview.userId))
          .limit(1);

        await createInAppNotification({
          userId: existingReview.userId,
          type: "REVIEW_MODERATED",
          title:
            status === "APPROVED" ? "Your review was approved" : "Your review was rejected",
          message: `Your review of "${book?.title ?? "a book"}" was ${status.toLowerCase()}.`,
          link: `/books/${existingReview.bookId}`,
        });

        if (author?.email) {
          await notifyReviewModerated({
            to: author.email,
            bookTitle: book?.title ?? "the book",
            status,
          });
        }
      })();

      return NextResponse.json({
        success: true,
        review: {
          ...updatedReview,
          reviewedByName: moderator?.fullName ?? null,
          reviewedByEmail: moderator?.email ?? null,
          reviewedByUniversityCard: moderator?.universityCard ?? null,
        },
      });
    }

    // Author content-edit path — rating/comment, any current status.
    // 404 + neutral body: status alone must not leak ownership via a
    // "permission denied" message when the review exists but isn't yours.
    if (existingReview.userId !== actor.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Review not found",
          message: "Review not found",
        },
        { status: 404 },
      );
    }

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

    // Editing content on an already-moderated review must re-enter the
    // moderation queue — otherwise an approved review's visible text could
    // be swapped out post-approval without another admin ever seeing it.
    const reentersModeration = existingReview.status !== "PENDING";

    const [updatedReview] = await db
      .update(bookReviews)
      .set({
        rating,
        comment: comment.trim(),
        updatedAt: new Date(),
        ...(reentersModeration
          ? { status: "PENDING", reviewedBy: null, reviewedAt: null }
          : {}),
      })
      .where(eq(bookReviews.id, reviewId))
      .returning({
        id: bookReviews.id,
        rating: bookReviews.rating,
        comment: bookReviews.comment,
        status: bookReviews.status,
        updatedAt: bookReviews.updatedAt,
      });

    revalidateMutationPaths("review.write");

    if (reentersModeration) {
      await logActivity({
        actorId: actor.id,
        action: "UPDATE",
        entityType: "review",
        entityId: reviewId,
        details: { bookId: existingReview.bookId, reenteredModeration: true },
      });

      // Fan out to admins for re-moderation — fire-and-forget.
      void (async () => {
        const admins = await getAllAdminUsers(actor.id);
        if (admins.length === 0) return;

        const [book] = await db
          .select({ title: books.title })
          .from(books)
          .where(eq(books.id, existingReview.bookId))
          .limit(1);

        await createInAppNotificationForUsers(
          admins.map((admin) => admin.id),
          {
            type: "REVIEW_SUBMITTED",
            title: "Edited review awaiting re-moderation",
            message: `${actor.name} edited their review of "${book?.title ?? "a book"}"`,
            link: `/admin/book-reviews/${reviewId}`,
          },
        );

        await notifyReviewSubmitted({
          recipients: admins.map((admin) => admin.email),
          reviewerName: actor.name,
          bookTitle: book?.title ?? "a book",
        });
      })();
    }

    return NextResponse.json({
      success: true,
      review: updatedReview,
      message: reentersModeration
        ? "Review updated and resubmitted for moderation"
        : "Review updated successfully",
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update review",
        message: "The review could not be updated.",
      },
      { status: 500 },
    );
  }
}
