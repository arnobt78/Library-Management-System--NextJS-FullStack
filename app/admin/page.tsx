/**
 * Admin Dashboard Page
 *
 * Server Component that fetches admin statistics server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 */

import React from "react";
import { getAllUsers } from "@/lib/admin/actions/user";
import { getAllBorrowRequests } from "@/lib/admin/actions/borrow";
import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import AdminDashboardContent from "@/components/AdminDashboardContent";

export const runtime = "nodejs";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) => {
  const params = await searchParams;
  // Fetch all data for dashboard
  const [usersResult, borrowResult, booksResult] = await Promise.all([
    getAllUsers(),
    getAllBorrowRequests(),
    db.select().from(books),
  ]);

  const users = usersResult.success ? usersResult.data : [];
  const borrowRequests = borrowResult.success ? borrowResult.data : [];
  const allBooks = booksResult;

  // Calculate statistics with null safety
  const totalUsers = users?.length || 0;
  const approvedUsers =
    users?.filter((u) => u.status === "APPROVED").length || 0;
  const pendingUsers = users?.filter((u) => u.status === "PENDING").length || 0;
  const adminUsers = users?.filter((u) => u.role === "ADMIN").length || 0;

  const totalBooks = allBooks.length;
  const totalCopies = allBooks.reduce((sum, book) => sum + book.totalCopies, 0);
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

  const activeBorrows =
    borrowRequests?.filter((r) => r.status === "BORROWED").length || 0;
  const pendingBorrows =
    borrowRequests?.filter((r) => r.status === "PENDING").length || 0;
  const returnedBooks =
    borrowRequests?.filter((r) => r.status === "RETURNED").length || 0;

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

  // Prepare initial stats data for Client Component
  const initialStats = {
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
    recentBorrows: recentBorrows.map((borrow) => ({
      id: borrow.id,
      bookTitle: borrow.bookTitle,
      userName: borrow.userName,
      status: borrow.status,
    })),
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      status: user.status || "PENDING", // Convert null to string
    })),
    // Category statistics
    categoryStats: sortedCategories,
    // Additional analytics
    booksByYear: sortedBooksByYear,
    booksByLanguage: sortedBooksByLanguage,
    topRatedBooks,
  };

  return (
    <AdminDashboardContent
      initialStats={initialStats}
      successMessage={params.success}
    />
  );
};

export default Page;
