/**
 * Related Books API Route
 *
 * GET /api/books/[id]/related?limit=6
 *
 * Purpose: Genre-related active books for the detail-page recommendations strip.
 * Excludes the source book; fills with high-rated actives when the genre pool is short.
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { parsePositiveInteger } from "@/lib/pagination";
import {
  clampRelatedLimit,
  getRelatedBooks,
} from "@/lib/books/getRelatedBooks";
import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
        { success: false, error: "Book ID is required" },
        { status: 400 }
      );
    }

    const [exists] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.id, id))
      .limit(1);

    if (!exists) {
      return NextResponse.json(
        { success: false, error: "Book not found" },
        { status: 404 }
      );
    }

    const limit = clampRelatedLimit(
      parsePositiveInteger(request.nextUrl.searchParams.get("limit"), 6, 12)
    );

    const related = await getRelatedBooks(id, limit);

    return NextResponse.json({
      success: true,
      books: related,
    });
  } catch (error) {
    console.error("Error fetching related books:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch related books",
      },
      { status: 500 }
    );
  }
}
