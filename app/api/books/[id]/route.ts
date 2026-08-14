/**
 * Single Book API Route
 *
 * GET /api/books/[id]
 *
 * Purpose: Get a single book by its ID with all details.
 * Joins updatedByActor so book.write invalidate refetch cannot wipe stamps.
 *
 * Route Parameters:
 * - id: Book ID (UUID)
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { loadBookWithUpdater } from "@/lib/books/loadBookWithUpdater";

export const runtime = "nodejs";

/**
 * Get a single book by ID (includes updatedByActor when updater exists).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns public book data (book details, not user-specific)
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

    const book = await loadBookWithUpdater(id);

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
      book: JSON.parse(JSON.stringify(book)),
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
