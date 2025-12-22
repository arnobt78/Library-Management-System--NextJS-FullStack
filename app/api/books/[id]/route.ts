/**
 * Single Book API Route
 *
 * GET /api/books/[id]
 *
 * Purpose: Get a single book by its ID with all details.
 *
 * Route Parameters:
 * - id: Book ID (UUID)
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * Get a single book by ID
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing book ID
 * @returns JSON response with book data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Book ID is required",
        },
        { status: 400 }
      );
    }

    // Fetch book by ID
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);

    if (!book) {
      return NextResponse.json(
        {
          success: false,
          error: "Book not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      book,
    });
  } catch (error) {
    console.error("Error fetching book:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch book",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
