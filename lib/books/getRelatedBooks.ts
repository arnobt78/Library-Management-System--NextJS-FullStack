/**
 * Server helper: related books for a detail page (genre-first, then high-rated fill).
 * Used by RSC detail page and GET /api/books/[id]/related.
 */

import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { and, desc, eq, ne, notInArray } from "drizzle-orm";

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;

/**
 * Clamp related-list size for API and SSR callers.
 */
export function clampRelatedLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

/**
 * Active books related to `bookId` by genre, excluding the source book.
 * Fills with other high-rated actives when the genre pool is short.
 */
export async function getRelatedBooks(
  bookId: string,
  limit: number = DEFAULT_LIMIT
): Promise<Book[]> {
  const capped = clampRelatedLimit(limit);

  const [source] = await db
    .select({ id: books.id, genre: books.genre })
    .from(books)
    .where(eq(books.id, bookId))
    .limit(1);

  if (!source) {
    return [];
  }

  const genreMatches = await db
    .select()
    .from(books)
    .where(
      and(
        eq(books.isActive, true),
        eq(books.genre, source.genre),
        ne(books.id, bookId)
      )
    )
    .orderBy(desc(books.rating), desc(books.createdAt))
    .limit(capped);

  let related = genreMatches as Book[];

  if (related.length < capped) {
    const excludeIds = [bookId, ...related.map((b) => b.id)];
    const fillers = await db
      .select()
      .from(books)
      .where(
        and(eq(books.isActive, true), notInArray(books.id, excludeIds))
      )
      .orderBy(desc(books.rating), desc(books.createdAt))
      .limit(capped - related.length);

    related = [...related, ...(fillers as Book[])];
  }

  return related.slice(0, capped);
}
