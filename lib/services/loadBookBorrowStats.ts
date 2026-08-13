/**
 * Server-side book borrow stats (DB) — SSR seed + API route share this.
 * Do not import from client components; use getBookBorrowStats (fetch) on client.
 * Parent: Book panel SSR polish
 */

import { db } from "@/database/drizzle";
import { borrowRecords } from "@/database/schema";
import { count, eq, sql } from "drizzle-orm";
import type { BookBorrowStats } from "@/lib/services/books";

/** Aggregate borrow counts for a book — zero when no rows. */
export async function loadBookBorrowStats(
  bookId: string,
): Promise<BookBorrowStats> {
  if (!bookId) {
    return { totalBorrows: 0, activeBorrows: 0, returnedBorrows: 0 };
  }

  const [stats] = await db
    .select({
      totalBorrows: count(),
      activeBorrows: sql<number>`count(case when ${borrowRecords.status} = 'BORROWED' then 1 end)`,
      returnedBorrows: sql<number>`count(case when ${borrowRecords.status} = 'RETURNED' then 1 end)`,
    })
    .from(borrowRecords)
    .where(eq(borrowRecords.bookId, bookId));

  return {
    totalBorrows: Number(stats?.totalBorrows) || 0,
    activeBorrows: Number(stats?.activeBorrows) || 0,
    returnedBorrows: Number(stats?.returnedBorrows) || 0,
  };
}
