/**
 * Books Genres API Route
 *
 * GET /api/books/genres
 *
 * Purpose: Get a list of unique genres from all books.
 *
 * Returns: Array of unique genre strings
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { asc } from "drizzle-orm";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Get unique genres from all books
 *
 * @param _request - Next.js request object (unused)
 * @returns JSON response with genres array
 */
export async function GET(_request: NextRequest) {
  try {
    // Rate limiting to prevent abuse
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

    // Get unique genres from all books
    const genresResult = await db
      .selectDistinct({ genre: books.genre })
      .from(books)
      .orderBy(asc(books.genre));

    const genres = genresResult.map((g) => g.genre).filter(Boolean);

    return NextResponse.json({
      success: true,
      genres,
    });
  } catch (error) {
    console.error("Error fetching genres:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch genres",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

