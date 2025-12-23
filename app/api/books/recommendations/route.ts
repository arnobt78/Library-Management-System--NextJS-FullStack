/**
 * Book Recommendations API Route
 *
 * GET /api/books/recommendations
 *
 * Purpose: Get personalized book recommendations for a user based on their reading history.
 *
 * Query Parameters:
 * - userId (optional): User ID for personalized recommendations
 * - limit (optional): Maximum number of recommendations (default: 10)
 *
 * Algorithm:
 * 1. If user has reading history, recommend books from similar genres/authors
 * 2. Exclude books the user has already borrowed
 * 3. If not enough recommendations, fill with high-rated books
 * 4. If no user or no history, return latest high-rated books
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { books, borrowRecords } from "@/database/schema";
import { desc, eq, sql, and, inArray, notInArray } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Get book recommendations for a user
 *
 * @param request - Next.js request object
 * @returns JSON response with recommended books array
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns personalized recommendations (if user is logged in) or high-rated books (if anonymous)
    // Rate limiting provides protection against abuse while keeping it accessible for public pages
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Get session to determine user if userId not provided
    // Note: Authentication is optional - works for both authenticated and anonymous users
    const session = await auth();
    const finalUserId = userId || session?.user?.id;

    let recommendedBooks: Book[] = [];

    if (finalUserId) {
      // Try to get recommendations based on user's reading history
      const userBorrowHistory = await db
        .select({
          genre: books.genre,
          author: books.author,
        })
        .from(borrowRecords)
        .innerJoin(books, eq(borrowRecords.bookId, books.id))
        .where(
          and(
            eq(borrowRecords.userId, finalUserId),
            eq(borrowRecords.status, "RETURNED")
          )
        )
        .limit(10);

      if (userBorrowHistory.length > 0) {
        // Get books from similar genres/authors that user hasn't borrowed
        const userBorrowedBookIds = await db
          .select({ bookId: borrowRecords.bookId })
          .from(borrowRecords)
          .where(eq(borrowRecords.userId, finalUserId));

        const borrowedIds = userBorrowedBookIds.map((record) => record.bookId);

        // Get unique genres from user's reading history
        const userGenres = [...new Set(userBorrowHistory.map((h) => h.genre))];

        // Get recommended books based on reading history
        const genreRecommendations = await db
          .select()
          .from(books)
          .where(
            and(
              inArray(books.genre, userGenres),
              borrowedIds.length > 0
                ? notInArray(books.id, borrowedIds)
                : sql`1=1`,
              eq(books.isActive, true)
            )
          )
          .orderBy(desc(books.rating), desc(books.createdAt))
          .limit(limit);

        recommendedBooks = genreRecommendations as Book[];

        // If we don't have enough recommendations from genres, fill with other high-rated books
        if (recommendedBooks.length < limit) {
          const additionalBooks = await db
            .select()
            .from(books)
            .where(
              and(
                borrowedIds.length > 0
                  ? notInArray(books.id, borrowedIds)
                  : sql`1=1`,
                eq(books.isActive, true)
              )
            )
            .orderBy(desc(books.rating), desc(books.createdAt))
            .limit(limit);

          // Filter out books already in recommendations and add unique ones
          const existingIds = recommendedBooks.map((book) => book.id);
          const uniqueAdditionalBooks = additionalBooks.filter(
            (book) => !existingIds.includes(book.id)
          );

          recommendedBooks = [
            ...recommendedBooks,
            ...uniqueAdditionalBooks,
          ].slice(0, limit);
        }
      }
    }

    // If no recommendations from history, get latest high-rated books
    if (recommendedBooks.length === 0) {
      recommendedBooks = (await db
        .select()
        .from(books)
        .where(eq(books.isActive, true))
        .orderBy(desc(books.rating), desc(books.createdAt))
        .limit(limit)) as Book[];
    }

    return NextResponse.json({
      success: true,
      recommendations: recommendedBooks,
    });
  } catch (error) {
    console.error("Error fetching book recommendations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch book recommendations",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
