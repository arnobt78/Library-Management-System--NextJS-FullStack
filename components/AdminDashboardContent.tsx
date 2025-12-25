"use client";

/**
 * AdminDashboardContent Component
 *
 * Client component that displays admin dashboard statistics and overview.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useAdminStats hook with initialData from SSR
 * - Displays skeleton loaders while fetching
 * - Shows error state if fetch fails
 * - Displays comprehensive statistics, charts, and recent activity
 */

import React from "react";
import AdminStatsSkeleton from "@/components/skeletons/AdminStatsSkeleton";
import { useAdminStats } from "@/hooks/useQueries";
import type { AdminStats } from "@/lib/services/admin";

interface AdminDashboardContentProps {
  /**
   * Initial admin stats data from SSR (prevents duplicate fetch)
   */
  initialStats?: AdminStats & {
    recentBorrows?: Array<{
      id: string;
      bookTitle: string;
      userName: string;
      status: string;
    }>;
    recentUsers?: Array<{
      id: string;
      fullName: string;
      email: string;
      status: string;
    }>;
    categoryStats?: Array<{
      genre: string;
      count: number;
      totalCopies: number;
      availableCopies: number;
      avgRating: number;
    }>;
    booksByYear?: Array<[string, number]>;
    booksByLanguage?: Array<[string, number]>;
    topRatedBooks?: Array<{
      id: string;
      title: string;
      author: string;
      rating: number;
    }>;
    activeBooks?: number;
    inactiveBooks?: number;
    booksWithISBN?: number;
    booksWithPublisher?: number;
    averagePageCount?: number;
  };
  /**
   * Success message from URL params
   */
  successMessage?: string;
}

const AdminDashboardContent: React.FC<AdminDashboardContentProps> = ({
  initialStats,
  successMessage,
}) => {
  // Use React Query hook with SSR initial data
  const {
    data: stats,
    isLoading,
    isError,
    error,
  } = useAdminStats(initialStats);

  // Show skeleton while loading (only if no initial data)
  if (isLoading && !initialStats) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Statistics Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <AdminStatsSkeleton key={`stat-${i}`} variant="stat" />
          ))}
        </div>
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <AdminStatsSkeleton key={`chart-${i}`} variant="card" />
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (isError && !initialStats) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-center sm:p-8">
          <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
            Failed to load admin statistics
          </p>
          <p className="text-xs text-gray-500 sm:text-sm">
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  // CRITICAL: Always prefer React Query data over initialStats
  // React Query data is fresh and updates immediately after mutations
  // initialStats is only used as fallback during initial load
  const statsData = stats ?? initialStats;

  if (!statsData) {
    return null;
  }

  // Extract data for rendering with proper type assertions
  const {
    totalUsers = 0,
    approvedUsers = 0,
    pendingUsers = 0,
    adminUsers = 0,
    totalBooks = 0,
    totalCopies = 0,
    availableCopies = 0,
    borrowedCopies = 0,
    activeBorrows = 0,
    pendingBorrows = 0,
    returnedBooks = 0,
  } = statsData;

  // Extract additional fields with type assertions
  const activeBooks = (statsData.activeBooks as number) || 0;
  const inactiveBooks = (statsData.inactiveBooks as number) || 0;
  const booksWithISBN = (statsData.booksWithISBN as number) || 0;
  const booksWithPublisher = (statsData.booksWithPublisher as number) || 0;
  const averagePageCount = (statsData.averagePageCount as number) || 0;

  // Extract arrays with proper type assertions
  type RecentBorrow = {
    id: string;
    bookTitle: string;
    userName: string;
    status: string;
  };
  type RecentUser = {
    id: string;
    fullName: string;
    email: string;
    status: string;
  };
  type CategoryStat = {
    genre: string;
    count: number;
    totalCopies: number;
    availableCopies: number;
    avgRating: number;
  };
  type TopRatedBook = {
    id: string;
    title: string;
    author: string;
    rating: number;
  };

  const recentBorrows = (statsData.recentBorrows as RecentBorrow[]) || [];
  const recentUsers = (statsData.recentUsers as RecentUser[]) || [];
  const categoryStats = (statsData.categoryStats as CategoryStat[]) || [];
  const booksByYear = (statsData.booksByYear as Array<[string, number]>) || [];
  const booksByLanguage =
    (statsData.booksByLanguage as Array<[string, number]>) || [];
  const topRatedBooks = (statsData.topRatedBooks as TopRatedBook[]) || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Success Message */}
      {successMessage === "admin-granted" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                🎉 Admin Access Granted!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  You are now an admin! You can access all admin features and
                  manage the library system.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="stat">
          <div className="stat-info">
            <h3 className="stat-label">Total Users</h3>
            <p className="text-xl font-bold text-blue-600 sm:text-2xl">{totalUsers}</p>
          </div>
          <div className="text-sm text-gray-500">
            {approvedUsers} approved, {pendingUsers} pending
          </div>
        </div>

        <div className="stat">
          <div className="stat-info">
            <h3 className="stat-label">Total Books</h3>
            <p className="text-xl font-bold text-green-600 sm:text-2xl">{totalBooks}</p>
          </div>
          <div className="text-sm text-gray-500">
            {totalCopies} total copies
          </div>
        </div>

        <div className="stat">
          <div className="stat-info">
            <h3 className="stat-label">Active Borrows</h3>
            <p className="text-xl font-bold text-purple-600 sm:text-2xl">
              {activeBorrows}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {pendingBorrows} pending, {returnedBooks} returned
          </div>
        </div>

        <div className="stat">
          <div className="stat-info">
            <h3 className="stat-label">Admins</h3>
            <p className="text-xl font-bold text-orange-600 sm:text-2xl">{adminUsers}</p>
          </div>
          <div className="text-sm text-gray-500">System administrators</div>
        </div>

        <div className="stat">
          <div className="stat-info">
            <h3 className="stat-label">Book Status</h3>
            <p className="text-xl font-bold text-indigo-600 sm:text-2xl">{activeBooks}</p>
          </div>
          <div className="text-sm text-gray-500">
            {activeBooks} active, {inactiveBooks} inactive
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Book Availability Chart */}
        <div className="stat">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">Book Availability</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Available Copies</span>
              <span className="font-medium">{availableCopies}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-600"
                style={{ width: `${(availableCopies / totalCopies) * 100}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Borrowed Copies</span>
              <span className="font-medium">{borrowedCopies}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${(borrowedCopies / totalCopies) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* User Status Chart */}
        <div className="stat">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">User Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Approved Users</span>
              <span className="font-medium">{approvedUsers}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-600"
                style={{ width: `${(approvedUsers / totalUsers) * 100}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Users</span>
              <span className="font-medium">{pendingUsers}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-yellow-600"
                style={{ width: `${(pendingUsers / totalUsers) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Enhanced Book Information Chart */}
        <div className="stat">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">Book Information</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Books with ISBN</span>
              <span className="font-medium">{booksWithISBN}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-indigo-600"
                style={{ width: `${(booksWithISBN / totalBooks) * 100}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Books with Publisher</span>
              <span className="font-medium">{booksWithPublisher}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-purple-600"
                style={{ width: `${(booksWithPublisher / totalBooks) * 100}%` }}
              ></div>
            </div>

            {averagePageCount > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg Page Count</span>
                  <span className="font-medium">
                    {Math.round(averagePageCount)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Borrows */}
        <div className="stat">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">Recent Borrows</h3>
          <div className="space-y-3">
            {recentBorrows.length === 0 ? (
              <p className="text-sm text-gray-500">No recent borrows</p>
            ) : (
              recentBorrows.map((borrow) => (
                <div
                  key={borrow.id}
                  className="flex flex-col gap-2 rounded bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-words">{borrow.bookTitle}</p>
                    <p className="text-xs text-gray-600 break-words">
                      by {borrow.userName}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                      borrow.status === "BORROWED"
                        ? "bg-blue-100 text-blue-800"
                        : borrow.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {borrow.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="stat">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">Recent Users</h3>
          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No recent users</p>
            ) : (
              recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-2 rounded bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-words">{user.fullName}</p>
                    <p className="text-xs text-gray-600 break-words">{user.email}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                      user.status === "APPROVED"
                        ? "bg-green-100 text-green-800"
                        : user.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Book Categories Section */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Book Categories */}
        <div className="stat">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">📚 Book Categories</h3>
          <div className="space-y-3">
            {categoryStats.length === 0 ? (
              <p className="text-sm text-gray-500">No books found</p>
            ) : (
              categoryStats.map((category) => (
                <div
                  key={category.genre}
                  className="flex items-center justify-between rounded bg-gray-50 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {category.genre}
                      </span>
                      <span className="text-sm font-bold text-blue-600">
                        {category.count} books
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                      <span>{category.totalCopies} total copies</span>
                      <span>{category.availableCopies} available</span>
                      {category.avgRating > 0 && (
                        <span className="flex items-center">
                          ⭐ {category.avgRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 h-1 w-full rounded-full bg-gray-200">
                      <div
                        className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{
                          width: `${(category.count / totalBooks) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Books by Publication Year */}
        <div className="stat">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">
            📅 Books by Publication Year
          </h3>
          <div className="space-y-3">
            {booksByYear.length === 0 ? (
              <p className="text-sm text-gray-500">No publication year data</p>
            ) : (
              booksByYear.map(([year, count]) => (
                <div
                  key={year}
                  className="flex items-center justify-between rounded bg-gray-50 p-3"
                >
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">{year}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-green-600">
                      {count} books
                    </span>
                    <div className="h-2 w-16 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{ width: `${(count / totalBooks) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Additional Statistics Section */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Books by Language */}
        <div className="stat">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">🌍 Books by Language</h3>
          <div className="space-y-2">
            {booksByLanguage.length === 0 ? (
              <p className="text-sm text-gray-500">No language data</p>
            ) : (
              booksByLanguage.map(([language, count]) => (
                <div
                  key={language}
                  className="flex items-center justify-between rounded bg-gray-50 p-2"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {language}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-purple-600">
                      {count}
                    </span>
                    <div className="h-1 w-12 rounded-full bg-gray-200">
                      <div
                        className="h-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${(count / totalBooks) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Rated Books */}
        <div className="stat">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">⭐ Top Rated Books</h3>
          <div className="space-y-2">
            {topRatedBooks.length === 0 ? (
              <p className="text-sm text-gray-500">No rated books</p>
            ) : (
              topRatedBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center justify-between rounded bg-gray-50 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {book.title}
                    </p>
                    <p className="truncate text-xs text-gray-600">
                      {book.author}
                    </p>
                  </div>
                  <div className="ml-2 flex items-center space-x-1">
                    <span className="text-xs font-bold text-yellow-600">
                      ⭐ {book.rating}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Library Health Metrics */}
        <div className="stat">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">🏥 Library Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Collection Diversity
              </span>
              <span className="text-sm font-bold text-indigo-600">
                {categoryStats.length} categories
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                style={{
                  width: `${Math.min((categoryStats.length / 10) * 100, 100)}%`,
                }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Availability Rate</span>
              <span className="text-sm font-bold text-green-600">
                {totalCopies > 0
                  ? Math.round((availableCopies / totalCopies) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                style={{
                  width: `${totalCopies > 0 ? (availableCopies / totalCopies) * 100 : 0}%`,
                }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">User Engagement</span>
              <span className="text-sm font-bold text-purple-600">
                {totalUsers > 0
                  ? Math.round((activeBorrows / totalUsers) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{
                  width: `${totalUsers > 0 ? Math.min((activeBorrows / totalUsers) * 100, 100) : 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardContent;
