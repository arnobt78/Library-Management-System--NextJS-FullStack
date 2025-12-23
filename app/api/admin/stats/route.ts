/**
 * Admin Stats API Route
 *
 * GET /api/admin/stats
 *
 * Purpose: Get comprehensive admin dashboard statistics including users, books, borrows, and analytics.
 *
 * Returns:
 * - User statistics (total, approved, pending, admins)
 * - Book statistics (total, copies, availability, active/inactive)
 * - Borrow statistics (active, pending, returned)
 * - Recent activity (recent borrows, recent users)
 * - Category statistics
 * - Additional analytics (books by year, language, top rated, etc.)
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllUsers } from "@/lib/admin/actions/user";
import { getAllBorrowRequests } from "@/lib/admin/actions/borrow";
import { db } from "@/database/drizzle";
import { books, users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

export const runtime = "nodejs";

/**
 * Get admin dashboard statistics
 *
 * @param request - Next.js request object
 * @returns JSON response with comprehensive admin statistics
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

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

    // Fetch all data for dashboard in parallel
    const [usersResult, borrowResult, booksResult] = await Promise.all([
      getAllUsers(),
      getAllBorrowRequests(),
      db.select().from(books),
    ]);

    const users = usersResult.success ? usersResult.data : [];
    const borrowRequests = borrowResult.success ? borrowResult.data : [];
    const allBooks = booksResult;

    // Calculate user statistics
    const totalUsers = users?.length || 0;
    const approvedUsers =
      users?.filter((u) => u.status === "APPROVED").length || 0;
    const pendingUsers =
      users?.filter((u) => u.status === "PENDING").length || 0;
    const adminUsers = users?.filter((u) => u.role === "ADMIN").length || 0;

    // Calculate book statistics
    const totalBooks = allBooks.length;
    const totalCopies = allBooks.reduce(
      (sum, book) => sum + book.totalCopies,
      0
    );
    const availableCopies = allBooks.reduce(
      (sum, book) => sum + book.availableCopies,
      0
    );

    // CRITICAL: Calculate borrowed copies correctly
    // Borrowed copies = Total copies - Available copies
    // This is the actual number of physical copies currently borrowed
    // NOT the count of borrow records (which would be incorrect for books with multiple copies)
    const borrowedCopies = totalCopies - availableCopies;

    // Enhanced book statistics
    const activeBooks = allBooks.filter((book) => book.isActive).length;
    const inactiveBooks = allBooks.filter((book) => !book.isActive).length;
    const booksWithISBN = allBooks.filter((book) => book.isbn).length;
    const booksWithPublisher = allBooks.filter((book) => book.publisher).length;
    const averagePageCount =
      allBooks
        .filter((book) => book.pageCount)
        .reduce((sum, book) => sum + (book.pageCount || 0), 0) /
        allBooks.filter((book) => book.pageCount).length || 0;

    // Calculate borrow statistics
    const activeBorrows =
      borrowRequests?.filter((r) => r.status === "BORROWED").length || 0;
    const pendingBorrows =
      borrowRequests?.filter((r) => r.status === "PENDING").length || 0;
    const returnedBooks =
      borrowRequests?.filter((r) => r.status === "RETURNED").length || 0;

    // Recent activity
    const recentBorrows = borrowRequests?.slice(0, 5) || [];
    const recentUsers = users?.slice(0, 5) || [];

    // Calculate book categories
    const categoryStats = allBooks.reduce(
      (acc, book) => {
        const genre = book.genre || "Unknown";
        if (!acc[genre]) {
          acc[genre] = {
            count: 0,
            totalCopies: 0,
            availableCopies: 0,
            avgRating: 0,
            totalRating: 0,
            ratingCount: 0,
          };
        }
        acc[genre].count += 1;
        acc[genre].totalCopies += book.totalCopies;
        acc[genre].availableCopies += book.availableCopies;
        if (book.rating && book.rating > 0) {
          acc[genre].totalRating += book.rating;
          acc[genre].ratingCount += 1;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          count: number;
          totalCopies: number;
          availableCopies: number;
          avgRating: number;
          totalRating: number;
          ratingCount: number;
        }
      >
    );

    // Calculate average ratings for each category
    Object.keys(categoryStats).forEach((genre) => {
      if (categoryStats[genre].ratingCount > 0) {
        categoryStats[genre].avgRating =
          categoryStats[genre].totalRating / categoryStats[genre].ratingCount;
      }
    });

    // Sort categories by book count
    const sortedCategories = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([genre, stats]) => ({ genre, ...stats }));

    // Calculate additional useful statistics
    const booksByYear = allBooks.reduce(
      (acc, book) => {
        const year = book.publicationYear || "Unknown";
        if (!acc[year]) {
          acc[year] = 0;
        }
        acc[year] += 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const sortedBooksByYear = Object.entries(booksByYear)
      .sort(([a], [b]) => {
        if (a === "Unknown") return 1;
        if (b === "Unknown") return -1;
        return parseInt(b) - parseInt(a);
      })
      .slice(0, 5);

    const booksByLanguage = allBooks.reduce(
      (acc, book) => {
        const language = book.language || "Unknown";
        if (!acc[language]) {
          acc[language] = 0;
        }
        acc[language] += 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const sortedBooksByLanguage = Object.entries(booksByLanguage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Top rated books
    const topRatedBooks = allBooks
      .filter((book) => book.rating && book.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        rating: book.rating || 0,
      }));

    return NextResponse.json({
      success: true,
      stats: {
        // User statistics
        totalUsers,
        approvedUsers,
        pendingUsers,
        adminUsers,
        // Book statistics
        totalBooks,
        totalCopies,
        availableCopies,
        borrowedCopies,
        activeBooks,
        inactiveBooks,
        booksWithISBN,
        booksWithPublisher,
        averagePageCount,
        // Borrow statistics
        activeBorrows,
        pendingBorrows,
        returnedBooks,
        // Recent activity
        recentBorrows,
        recentUsers,
        // Category statistics
        categoryStats: sortedCategories,
        // Additional analytics
        booksByYear: sortedBooksByYear,
        booksByLanguage: sortedBooksByLanguage,
        topRatedBooks,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch admin statistics",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
