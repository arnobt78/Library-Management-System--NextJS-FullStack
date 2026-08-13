/**
 * Admin Borrow Requests API Route
 *
 * GET /api/admin/borrow-requests
 *
 * Purpose: Get all borrow requests with user and book details for admin management.
 *
 * Query Parameters:
 * - status (optional): Filter by status (PENDING, BORROWED, RETURNED)
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { borrowRecords, books, users } from "@/database/schema";
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

/**
 * Get all borrow requests with user and book details (admin view)
 *
 * @param request - Next.js request object
 * @returns JSON response with borrow requests array
 */
export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as
      | "PENDING"
      | "BORROWED"
      | "RETURNED"
      | null;

    // Build where conditions
    const whereConditions = [];

    // Status filter
    if (status) {
      whereConditions.push(eq(borrowRecords.status, status));
    }

    // Search condition - case-insensitive using ILIKE
    if (search) {
      const searchPattern = `%${search}%`;
      whereConditions.push(
        or(
          ilike(books.title, searchPattern),
          ilike(books.author, searchPattern),
          ilike(users.fullName, searchPattern),
          ilike(users.email, searchPattern),
          sql`CAST(${users.universityId} AS TEXT) ILIKE ${searchPattern}`
        )
      );
    }

    // Fetch borrow records with user and book details
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
        // User details
        userName: users.fullName,
        userEmail: users.email,
        userUniversityId: users.universityId,
        userUniversityCard: users.universityCard,
        // Book details
        bookTitle: books.title,
        bookAuthor: books.author,
        bookGenre: books.genre,
        bookRating: books.rating,
        bookCoverUrl: books.coverUrl,
        bookCoverColor: books.coverColor,
      })
      .from(borrowRecords)
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(
        whereConditions.length > 0 ? and(...whereConditions) : undefined
      )
      .orderBy(desc(borrowRecords.createdAt));

    // Transform to BorrowRecordWithDetails format
    const requests = allBorrowRecords.map((record) => ({
      id: record.id,
      userId: record.userId,
      bookId: record.bookId,
      borrowDate: record.borrowDate,
      dueDate: record.dueDate,
      returnDate: record.returnDate,
      status: record.status,
      borrowedBy: record.borrowedBy,
      returnedBy: record.returnedBy,
      fineAmount: record.fineAmount,
      notes: record.notes,
      renewalCount: record.renewalCount,
      lastReminderSent: record.lastReminderSent,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
      createdAt: record.createdAt,
      userName: record.userName,
      userEmail: record.userEmail,
      userUniversityId: record.userUniversityId,
      userUniversityCard: record.userUniversityCard ?? null,
      bookTitle: record.bookTitle,
      bookAuthor: record.bookAuthor,
      bookGenre: record.bookGenre,
      bookRating: record.bookRating ?? null,
      bookCoverUrl: record.bookCoverUrl,
      bookCoverColor: record.bookCoverColor,
    }));

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Error fetching borrow requests:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch borrow requests",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
