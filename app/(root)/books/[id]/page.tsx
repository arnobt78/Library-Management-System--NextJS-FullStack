import React from "react";
import { db } from "@/database/drizzle";
import { books, bookReviews, users, borrowRecords } from "@/database/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BookOverview from "@/components/BookOverview";
import BookDetailContent from "@/components/BookDetailContent";
import RelatedBookRecommendations from "@/components/RelatedBookRecommendations";
import { getRelatedBooks } from "@/lib/books/getRelatedBooks";
import type { BorrowRecord } from "@/lib/services/borrows";
import type { ReviewEligibility } from "@/lib/services/reviews";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const session = await auth();

  // Fetch data based on id
  const [bookDetails] = await db
    .select()
    .from(books)
    .where(eq(books.id, id))
    .limit(1);

  if (!bookDetails) redirect("/404");

  // Fetch user borrows for SSR (if user is logged in)
  // This ensures BookBorrowButton shows correct state immediately on first load
  let initialUserBorrows: BorrowRecord[] | undefined = undefined;

  if (session?.user?.id) {
    // Fetch user's borrow records (matching API response format)
    const userBorrowRecords = await db
      .select({
        id: borrowRecords.id,
        userId: borrowRecords.userId,
        bookId: borrowRecords.bookId,
        borrowDate: borrowRecords.borrowDate,
        dueDate: borrowRecords.dueDate,
        returnDate: borrowRecords.returnDate,
        status: borrowRecords.status,
        borrowedBy: borrowRecords.borrowedBy,
        returnedBy: borrowRecords.returnedBy,
        fineAmount: borrowRecords.fineAmount,
        notes: borrowRecords.notes,
        renewalCount: borrowRecords.renewalCount,
        lastReminderSent: borrowRecords.lastReminderSent,
        updatedAt: borrowRecords.updatedAt,
        updatedBy: borrowRecords.updatedBy,
        createdAt: borrowRecords.createdAt,
      })
      .from(borrowRecords)
      .where(eq(borrowRecords.userId, session.user.id))
      .orderBy(desc(borrowRecords.createdAt));

    // Transform to match BorrowRecord type
    // Drizzle's date() type returns strings (YYYY-MM-DD), timestamp() returns Date objects
    // BorrowRecord expects: borrowDate as Date, dueDate/returnDate as string, fineAmount as string
    initialUserBorrows = userBorrowRecords.map((record) => {
      // Handle dueDate: Drizzle date() returns string (YYYY-MM-DD format)
      const dueDateValue = record.dueDate as string | Date | null;
      let dueDateStr: string | null = null;
      if (dueDateValue) {
        if (typeof dueDateValue === "string") {
          dueDateStr = dueDateValue;
        } else {
          dueDateStr = dueDateValue.toISOString().split("T")[0];
        }
      }

      // Handle returnDate: Drizzle date() returns string (YYYY-MM-DD format)
      const returnDateValue = record.returnDate as string | Date | null;
      let returnDateStr: string | null = null;
      if (returnDateValue) {
        if (typeof returnDateValue === "string") {
          returnDateStr = returnDateValue;
        } else {
          returnDateStr = returnDateValue.toISOString().split("T")[0];
        }
      }

      return {
        id: record.id,
        userId: record.userId,
        bookId: record.bookId,
        borrowDate: record.borrowDate, // timestamp() returns Date object
        dueDate: dueDateStr,
        returnDate: returnDateStr,
        status: record.status as "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED",
        borrowedBy: record.borrowedBy,
        returnedBy: record.returnedBy,
        fineAmount: record.fineAmount || "0.00",
        notes: record.notes,
        renewalCount: record.renewalCount,
        lastReminderSent: record.lastReminderSent, // timestamp() returns Date object
        updatedAt: record.updatedAt, // timestamp() returns Date object
        updatedBy: record.updatedBy,
        createdAt: record.createdAt, // timestamp() returns Date object
      };
    });
  }

  // Fetch reviews for this book — only APPROVED, except the viewer's own
  // review (shown instantly at PENDING so they see their submission).
  // Parent: CR-0003 / REQ-0034 — Book Review moderation
  const reviewVisibility = session?.user?.id
    ? or(
        eq(bookReviews.status, "APPROVED"),
        and(eq(bookReviews.status, "PENDING"), eq(bookReviews.userId, session.user.id)),
      )
    : eq(bookReviews.status, "APPROVED");

  // No author `userEmail` — public page; opaque userId is enough for ownership/
  // avatar seed. Moderator join mirrors GET `/api/reviews/[bookId]` so first
  // paint includes Approved date + Approved by (REQ-0035 densify/SSR parity).
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
    .where(and(eq(bookReviews.bookId, id), reviewVisibility))
    .orderBy(desc(bookReviews.createdAt));

  // Fetch review eligibility for SSR (if user is logged in)
  // This ensures ReviewButton shows correct state immediately on first load
  let initialReviewEligibility: ReviewEligibility | undefined = undefined;

  if (session?.user?.id) {
    // Check if user has borrowed and returned this book (for eligibility)
    const userReturnedBorrows = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, session.user.id),
          eq(borrowRecords.bookId, id),
          eq(borrowRecords.status, "RETURNED")
        )
      )
      .limit(1);

    // Check if user currently has this book borrowed
    const currentBorrow = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, session.user.id),
          eq(borrowRecords.bookId, id),
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
          eq(bookReviews.bookId, id)
        )
      )
      .limit(1);

    // Calculate eligibility (matching API route logic)
    const hasExistingReview = existingReview.length > 0;
    const canReview = userReturnedBorrows.length > 0 && !hasExistingReview;
    const isCurrentlyBorrowed = currentBorrow.length > 0;

    initialReviewEligibility = {
      success: true,
      canReview,
      hasExistingReview,
      isCurrentlyBorrowed,
      reason: hasExistingReview
        ? "You have already reviewed this book"
        : userReturnedBorrows.length === 0
          ? "You must have borrowed this book to review it"
          : "You can review this book",
    };
  }

  // Genre-related strip (SSR seed; RQ refreshes after book mutations)
  const relatedBooksRaw = await getRelatedBooks(id, 6);
  const initialRelated = JSON.parse(
    JSON.stringify(relatedBooksRaw)
  ) as Book[];

  return (
    <>
      {/* BookOverview is a Server Component, so we render it directly */}
      <BookOverview
        {...bookDetails}
        userId={(session?.user?.id || "") as string}
        isDetailPage={true}
        initialUserBorrows={initialUserBorrows}
        initialReviewEligibility={initialReviewEligibility}
      />

      {/* BookDetailContent handles video, summary, and reviews with React Query */}
      <BookDetailContent
        bookId={id}
        userId={session?.user?.id}
        initialBook={bookDetails}
        initialReviews={reviews}
      />

      <RelatedBookRecommendations
        bookId={id}
        initialRelated={initialRelated}
        limit={6}
      />
    </>
  );
};
export default Page;
