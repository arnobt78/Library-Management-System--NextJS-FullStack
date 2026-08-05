/**
 * Book Review moderation read path — shared by SSR pages and
 * `/api/reviews/admin*` refetches. Parent: CR-0003 / REQ-0035 polish
 *
 * Enriched fields (no migration): book author/genre/rating, moderator
 * email+card, and the review author's preferred borrow dates for the book
 * (active BORROWED first, else latest RETURNED).
 */
import "server-only";

import { cache } from "react";
import { db } from "@/database/drizzle";
import { bookReviews, books, users } from "@/database/schema";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { AdminReviewFilters } from "@/lib/services/reviews";

const reviewer = alias(users, "review_reviewer");

/**
 * Correlated subquery: prefer open BORROWED (no return), else latest RETURNED.
 * Returns borrow_date / due_date / return_date as text (ISO-friendly).
 */
const preferredBorrowDateSql = sql<string | null>`(
  SELECT br.borrow_date::text
  FROM borrow_records br
  WHERE br.user_id = ${bookReviews.userId}
    AND br.book_id = ${bookReviews.bookId}
    AND br.status IN ('BORROWED', 'RETURNED')
  ORDER BY
    CASE WHEN br.status = 'BORROWED' AND br.return_date IS NULL THEN 0 ELSE 1 END,
    br.borrow_date DESC
  LIMIT 1
)`;

const preferredDueDateSql = sql<string | null>`(
  SELECT br.due_date::text
  FROM borrow_records br
  WHERE br.user_id = ${bookReviews.userId}
    AND br.book_id = ${bookReviews.bookId}
    AND br.status IN ('BORROWED', 'RETURNED')
  ORDER BY
    CASE WHEN br.status = 'BORROWED' AND br.return_date IS NULL THEN 0 ELSE 1 END,
    br.borrow_date DESC
  LIMIT 1
)`;

const preferredReturnDateSql = sql<string | null>`(
  SELECT br.return_date::text
  FROM borrow_records br
  WHERE br.user_id = ${bookReviews.userId}
    AND br.book_id = ${bookReviews.bookId}
    AND br.status IN ('BORROWED', 'RETURNED')
  ORDER BY
    CASE WHEN br.status = 'BORROWED' AND br.return_date IS NULL THEN 0 ELSE 1 END,
    br.borrow_date DESC
  LIMIT 1
)`;

function baseReviewSelect() {
  return db
    .select({
      id: bookReviews.id,
      rating: bookReviews.rating,
      comment: bookReviews.comment,
      status: bookReviews.status,
      bookId: bookReviews.bookId,
      bookTitle: books.title,
      bookCoverUrl: books.coverUrl,
      bookCoverColor: books.coverColor,
      bookAuthor: books.author,
      bookGenre: books.genre,
      bookRating: books.rating,
      userId: bookReviews.userId,
      userName: users.fullName,
      userEmail: users.email,
      userUniversityCard: users.universityCard,
      reviewedBy: bookReviews.reviewedBy,
      reviewedByName: reviewer.fullName,
      reviewedByEmail: reviewer.email,
      reviewedByUniversityCard: reviewer.universityCard,
      reviewedAt: bookReviews.reviewedAt,
      createdAt: bookReviews.createdAt,
      updatedAt: bookReviews.updatedAt,
      borrowedAt: preferredBorrowDateSql,
      dueDate: preferredDueDateSql,
      returnedAt: preferredReturnDateSql,
    })
    .from(bookReviews)
    .innerJoin(books, eq(bookReviews.bookId, books.id))
    .innerJoin(users, eq(bookReviews.userId, users.id))
    .leftJoin(reviewer, eq(bookReviews.reviewedBy, reviewer.id));
}

function serializeRow(
  row: Awaited<ReturnType<typeof baseReviewSelect>>[number],
): AdminBookReviewItem {
  return {
    ...row,
    bookCoverUrl: row.bookCoverUrl ?? null,
    bookCoverColor: row.bookCoverColor ?? null,
    userUniversityCard: row.userUniversityCard ?? null,
    reviewedBy: row.reviewedBy ?? null,
    reviewedByName: row.reviewedByName ?? null,
    reviewedByEmail: row.reviewedByEmail ?? null,
    reviewedByUniversityCard: row.reviewedByUniversityCard ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    borrowedAt: row.borrowedAt ?? null,
    dueDate: row.dueDate ?? null,
    returnedAt: row.returnedAt ?? null,
  };
}

/** Admin moderation queue — every review, all statuses. */
export async function getAdminBookReviews(
  filters: AdminReviewFilters = {},
): Promise<AdminBookReviewItem[]> {
  const conditions = [
    filters.status ? eq(bookReviews.status, filters.status) : undefined,
    filters.search?.trim()
      ? or(
          ilike(books.title, `%${filters.search.trim()}%`),
          ilike(users.fullName, `%${filters.search.trim()}%`),
          ilike(users.email, `%${filters.search.trim()}%`),
        )
      : undefined,
  ].filter(Boolean);

  const rows = await baseReviewSelect()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bookReviews.createdAt));

  return rows.map(serializeRow);
}

/** Signed-in user's own reviews (any status) — My Reviews tab. */
export async function getUserBookReviews(
  userId: string,
): Promise<AdminBookReviewItem[]> {
  const rows = await baseReviewSelect()
    .where(eq(bookReviews.userId, userId))
    .orderBy(desc(bookReviews.createdAt));

  return rows.map(serializeRow);
}

export async function getAdminReviewDetail(
  reviewId: string,
): Promise<AdminBookReviewItem | null> {
  const [row] = await baseReviewSelect()
    .where(eq(bookReviews.id, reviewId))
    .limit(1);
  return row ? serializeRow(row) : null;
}

/**
 * Sidebar badge — reviews awaiting moderation.
 * Wrapped in React `cache()` so admin layout.tsx + page.tsx both calling this
 * in the same request dedupe to a single DB round trip (request-scoped memo).
 */
export const getPendingReviewCount = cache(async (): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookReviews)
    .where(eq(bookReviews.status, "PENDING"));
  return Number(rows[0]?.count ?? 0);
});
