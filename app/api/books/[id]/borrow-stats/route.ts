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
import { db } from "@/database/drizzle";
import { borrowRecords } from "@/database/schema";
import { eq, count, sql } from "drizzle-orm";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";

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

    // Get borrow records statistics for this book
    const borrowStats = await db
      .select({
        totalBorrows: count(),
        activeBorrows: sql<number>`count(case when ${borrowRecords.status} = 'BORROWED' then 1 end)`,
        returnedBorrows: sql<number>`count(case when ${borrowRecords.status} = 'RETURNED' then 1 end)`,
      })
      .from(borrowRecords)
      .where(eq(borrowRecords.bookId, id));

    const stats = borrowStats[0] || {
      totalBorrows: 0,
      activeBorrows: 0,
      returnedBorrows: 0,
    };

    return NextResponse.json({
      success: true,
      stats: {
        totalBorrows: Number(stats.totalBorrows) || 0,
        activeBorrows: Number(stats.activeBorrows) || 0,
        returnedBorrows: Number(stats.returnedBorrows) || 0,
      },
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
