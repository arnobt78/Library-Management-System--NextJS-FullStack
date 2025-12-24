/**
 * Books API Route
 *
 * GET /api/books
 *
 * Purpose: Get a list of books with optional search, filters, sorting, and pagination.
 *
 * Query Parameters:
 * - search (optional): Search by title or author
 * - genre (optional): Filter by genre
 * - availability (optional): Filter by availability ("available" or "unavailable")
 * - rating (optional): Minimum rating (1-5)
 * - sort (optional): Sort order ("title", "author", "rating", "date")
 * - page (optional): Page number (default: 1)
 * - limit (optional): Books per page (default: 12)
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { desc, asc, eq, like, and, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Get books list with filters and pagination
 *
 * @param request - Next.js request object
 * @returns JSON response with books array, pagination info, and genres list
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns public book data (book list with filters, not user-specific)
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

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get("search") || "";
    const genre = searchParams.get("genre") || "";
    const availability = searchParams.get("availability") || "";
    const rating = searchParams.get("rating") || "";
    const sort = searchParams.get("sort") || "title";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    // Build where conditions
    const whereConditions = [];

    // Search condition - case-insensitive using ILIKE
    if (search) {
      const searchPattern = `%${search}%`;
      whereConditions.push(
        or(
          sql`${books.title}::text ILIKE ${sql.raw(`'${searchPattern.replace(/'/g, "''")}'`)}`,
          sql`${books.author}::text ILIKE ${sql.raw(`'${searchPattern.replace(/'/g, "''")}'`)}`
        )
      );
    }

    // Genre filter
    if (genre) {
      whereConditions.push(eq(books.genre, genre));
    }

    // Availability filter
    if (availability === "available") {
      whereConditions.push(sql`${books.availableCopies} > 0`);
    } else if (availability === "unavailable") {
      whereConditions.push(sql`${books.availableCopies} = 0`);
    }

    // Rating filter
    if (rating) {
      const minRating = parseInt(rating, 10);
      whereConditions.push(sql`${books.rating} >= ${minRating}`);
    }

    // Build sort order
    let orderBy;
    switch (sort) {
      case "author":
        orderBy = asc(books.author);
        break;
      case "rating":
        orderBy = desc(books.rating);
        break;
      case "date":
        orderBy = desc(books.createdAt);
        break;
      case "title":
      default:
        orderBy = asc(books.title);
        break;
    }

    // Fetch books with pagination
    const offset = (page - 1) * limit;
    const allBooks = await db
      .select()
      .from(books)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalBooksResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const totalBooks = totalBooksResult[0]?.count || 0;
    const totalPages = Math.ceil(totalBooks / limit);

    // Get unique genres for filter dropdown
    const genresResult = await db
      .selectDistinct({ genre: books.genre })
      .from(books)
      .orderBy(asc(books.genre));

    const genres = genresResult.map((g) => g.genre);

    return NextResponse.json({
      success: true,
      books: allBooks,
      pagination: {
        currentPage: page,
        totalPages,
        totalBooks,
        booksPerPage: limit,
      },
      genres,
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch books",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
