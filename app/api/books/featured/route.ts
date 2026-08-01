/**
 * Featured Books API
 *
 * GET /api/books/featured?limit=10
 *
 * Returns the curated featured book first (if active), then fills remaining
 * slots with newest active books. Public read-only catalog endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1),
      50
    );

    const featuredRows = await db
      .select()
      .from(books)
      .where(and(eq(books.isFeatured, true), eq(books.isActive, true)))
      .limit(1);

    const featured = featuredRows[0];
    const remaining = Math.max(0, limit - (featured ? 1 : 0));

    let fillers: (typeof books.$inferSelect)[] = [];
    if (remaining > 0) {
      fillers = await db
        .select()
        .from(books)
        .where(
          featured
            ? and(eq(books.isActive, true), ne(books.id, featured.id))
            : eq(books.isActive, true)
        )
        .orderBy(desc(books.createdAt))
        .limit(remaining);
    }

    const result = featured ? [featured, ...fillers] : fillers;

    return NextResponse.json({
      success: true,
      books: JSON.parse(JSON.stringify(result)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch featured books",
      },
      { status: 500 }
    );
  }
}
