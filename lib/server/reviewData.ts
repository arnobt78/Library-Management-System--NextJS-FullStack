/**
 * Book Review moderation read path — shared by SSR pages and
 * `/api/reviews/admin*` refetches. Parent: CR-0003 / REQ-0034
 */
import "server-only";

import { cache } from "react";
import { db } from "@/database/drizzle";
import { bookReviews, books, users } from "@/database/schema";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { AdminReviewFilters } from "@/lib/services/reviews";

const reviewer = alias(users, "review_reviewer");

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
      userId: bookReviews.userId,
      userName: users.fullName,
      userEmail: users.email,
      reviewedBy: bookReviews.reviewedBy,
      reviewedByName: reviewer.fullName,
      reviewedAt: bookReviews.reviewedAt,
      createdAt: bookReviews.createdAt,
      updatedAt: bookReviews.updatedAt,
    })
    .from(bookReviews)
    .innerJoin(books, eq(bookReviews.bookId, books.id))
    .innerJoin(users, eq(bookReviews.userId, users.id))
    .leftJoin(reviewer, eq(bookReviews.reviewedBy, reviewer.id));
}

function serializeRow<T extends { createdAt: Date | null; updatedAt: Date | null; reviewedAt: Date | null }>(
  row: T,
) {
  return {
    ...row,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
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
