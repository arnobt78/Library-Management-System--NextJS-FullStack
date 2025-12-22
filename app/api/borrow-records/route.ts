/**
 * Borrow Records API Route
 *
 * GET /api/borrow-records
 *
 * Purpose: Get borrow records with optional filters (user, book, status, date range, etc.).
 *
 * Query Parameters:
 * - userId (optional): Filter by user ID
 * - bookId (optional): Filter by book ID
 * - status (optional): Filter by status (PENDING, BORROWED, RETURNED)
 * - dateFrom (optional): Filter by borrow date from (YYYY-MM-DD)
 * - dateTo (optional): Filter by borrow date to (YYYY-MM-DD)
 * - overdue (optional): Filter only overdue records (true/false)
 * - sort (optional): Sort order (date, dueDate, status, user)
 * - page (optional): Page number (default: 1)
 * - limit (optional): Records per page (default: 50)
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { borrowRecords, books, users } from "@/database/schema";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";

export const runtime = "nodejs";

/**
 * Get borrow records with filters
 *
 * @param request - Next.js request object
 * @returns JSON response with borrow records array
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const userId = searchParams.get("userId") || undefined;
    const bookId = searchParams.get("bookId") || undefined;
    const status = searchParams.get("status") as
      | "PENDING"
      | "BORROWED"
      | "RETURNED"
      | null;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const overdue = searchParams.get("overdue") === "true";
    const sort = searchParams.get("sort") || "date";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // If userId is not provided and user is authenticated, use current user
    const finalUserId = userId || session?.user?.id;

    // Build where conditions
    const whereConditions = [];

    if (finalUserId) {
      whereConditions.push(eq(borrowRecords.userId, finalUserId));
    }

    if (bookId) {
      whereConditions.push(eq(borrowRecords.bookId, bookId));
    }

    if (status) {
      whereConditions.push(eq(borrowRecords.status, status));
    }

    if (dateFrom) {
      // Convert string to Date for comparison
      const dateFromObj = new Date(dateFrom);
      whereConditions.push(gte(borrowRecords.borrowDate, dateFromObj));
    }

    if (dateTo) {
      // Convert string to Date for comparison
      const dateToObj = new Date(dateTo);
      whereConditions.push(lte(borrowRecords.borrowDate, dateToObj));
    }

    if (overdue) {
      whereConditions.push(
        and(
          eq(borrowRecords.status, "BORROWED"),
          sql`${borrowRecords.dueDate} < CURRENT_DATE`
        )
      );
    }

    // Build sort order
    let orderBy;
    switch (sort) {
      case "dueDate":
        orderBy = desc(borrowRecords.dueDate);
        break;
      case "status":
        orderBy = asc(borrowRecords.status);
        break;
      case "user":
        orderBy = asc(borrowRecords.userId);
        break;
      case "date":
      default:
        orderBy = desc(borrowRecords.createdAt);
        break;
    }

    // Fetch borrow records with book details
    const offset = (page - 1) * limit;
    const allBorrowRecords = await db
      .select({
        // Borrow record fields
        id: borrowRecords.id,
        userId: borrowRecords.userId,
        bookId: borrowRecords.bookId,
        borrowDate: borrowRecords.borrowDate,
        dueDate: borrowRecords.dueDate,
        returnDate: borrowRecords.returnDate,
        status: borrowRecords.status,
        borrowedBy: borrowRecords.borrowedBy,
        returnedBy: borrowRecords.returnedBy,
        fineAmount: borrowRecords.fineAmount,
        notes: borrowRecords.notes,
        renewalCount: borrowRecords.renewalCount,
        lastReminderSent: borrowRecords.lastReminderSent,
        updatedAt: borrowRecords.updatedAt,
        updatedBy: borrowRecords.updatedBy,
        createdAt: borrowRecords.createdAt,
        // Book fields
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          genre: books.genre,
          rating: books.rating,
          totalCopies: books.totalCopies,
          availableCopies: books.availableCopies,
          description: books.description,
          coverColor: books.coverColor,
          coverUrl: books.coverUrl,
          videoUrl: books.videoUrl,
          summary: books.summary,
          isbn: books.isbn,
          publicationYear: books.publicationYear,
          publisher: books.publisher,
          language: books.language,
          pageCount: books.pageCount,
          edition: books.edition,
          isActive: books.isActive,
          createdAt: books.createdAt,
          updatedAt: books.updatedAt,
          updatedBy: books.updatedBy,
        },
      })
      .from(borrowRecords)
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalRecordsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(borrowRecords)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const totalRecords = totalRecordsResult[0]?.count || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      success: true,
      borrows: allBorrowRecords,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        recordsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching borrow records:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch borrow records",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
