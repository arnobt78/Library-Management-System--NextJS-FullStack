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
import { eq, desc, and, or, sql } from "drizzle-orm";
import { auth } from "@/auth";

export const runtime = "nodejs";

/**
 * Get all borrow requests with user and book details (admin view)
 *
 * @param request - Next.js request object
 * @returns JSON response with borrow requests array
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Check if user is admin
    // CRITICAL: Check role from session first (if available from new JWT)
    // If not available, fallback to database check (for existing sessions)
    let isAdmin = false;
    if ((session.user as { role?: string }).role === "ADMIN") {
      isAdmin = true;
    } else {
      // Fallback: Check database if role not in session (for existing sessions)
      // This handles cases where JWT was created before role was added
      const user = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      isAdmin = user[0]?.role === "ADMIN";
    }

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

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
          sql`${books.title}::text ILIKE ${sql.raw(`'${searchPattern.replace(/'/g, "''")}'`)}`,
          sql`${books.author}::text ILIKE ${sql.raw(`'${searchPattern.replace(/'/g, "''")}'`)}`,
          sql`${users.fullName}::text ILIKE ${sql.raw(`'${searchPattern.replace(/'/g, "''")}'`)}`,
          sql`${users.email}::text ILIKE ${sql.raw(`'${searchPattern.replace(/'/g, "''")}'`)}`,
          sql`CAST(${users.universityId} AS TEXT) ILIKE ${sql.raw(`'${searchPattern.replace(/'/g, "''")}'`)}`
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
        // Book details
        bookTitle: books.title,
        bookAuthor: books.author,
        bookGenre: books.genre,
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
      // User details
      userName: record.userName,
      userEmail: record.userEmail,
      userUniversityId: record.userUniversityId,
      // Book details
      bookTitle: record.bookTitle,
      bookAuthor: record.bookAuthor,
      bookGenre: record.bookGenre,
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
