/**
 * Book Borrow Statistics API Route
 *
 * GET /api/books/[id]/borrow-stats
 *
 * Purpose: Get borrow statistics for a specific book.
 *
 * Route Parameters:
 * - id: Book ID (UUID)
 *
 * Returns:
 * - totalBorrows: Total number of times this book has been borrowed
 * - activeBorrows: Number of currently active (BORROWED) borrows
 * - returnedBorrows: Number of successfully returned borrows
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { loadBookBorrowStats } from "@/lib/services/loadBookBorrowStats";

export const runtime = "nodejs";

/**
 * Get borrow statistics for a specific book
 *
 * @param _request - Next.js request object
 * @param params - Route parameters containing book ID
 * @returns JSON response with borrow statistics
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns public book statistics (aggregate data, not user-specific)
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

    const stats = await loadBookBorrowStats(id);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching book borrow statistics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch book borrow statistics",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
