"use client";

/**
 * BookBorrowStats Component
 *
 * Client component that displays borrow statistics for a specific book.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useBookBorrowStats and useBook hooks with initialData from SSR
 * - Displays statistics: total borrows, active borrows, returned borrows
 * - Updates immediately when borrows change (via cache invalidation)
 * - Shows availability status based on availableCopies from React Query book data
 */

import React from "react";
import { useBookBorrowStats, useBook } from "@/hooks/useQueries";
import { Skeleton } from "@/components/ui/skeleton";

interface BookBorrowStatsProps {
  /**
   * Book ID (UUID)
   */
  bookId: string;
  /**
   * Initial available copies (from SSR, fallback only - React Query data takes precedence)
   * @deprecated Use initialBook prop instead for better data consistency
   */
  availableCopies?: number;
  /**
   * Initial book data from SSR (prevents duplicate fetch, provides availableCopies)
   */
  initialBook?: Book;
  /**
   * Initial borrow statistics from SSR (prevents duplicate fetch)
   */
  initialStats?: {
    totalBorrows: number;
    activeBorrows: number;
    returnedBorrows: number;
  };
}

const BookBorrowStats: React.FC<BookBorrowStatsProps> = ({
  bookId,
  availableCopies: propAvailableCopies,
  initialBook,
  initialStats,
}) => {
  // Use React Query hook to get book data (for availableCopies that updates immediately)
  const {
    data: book,
    isLoading: bookLoading,
  } = useBook(bookId, initialBook);

  // Use React Query hook with SSR initial data for borrow stats
  const {
    data: stats,
    isLoading: statsLoading,
    isError,
  } = useBookBorrowStats(bookId, initialStats);

  // CRITICAL: Always prefer React Query data over initial/prop data
  // React Query data is fresh and updates immediately after mutations
  // initial/prop data is only used as fallback during initial load
  const statsData = stats ?? initialStats;
  
  // Get availableCopies from React Query book data (updates immediately)
  // Fallback to prop or initialBook if React Query data not yet loaded
  const availableCopies = book?.availableCopies ?? 
    initialBook?.availableCopies ?? 
    propAvailableCopies ?? 
    0;

  const isLoading = bookLoading || statsLoading;

  // Show skeleton while loading (only if no initial data)
  if (isLoading && !initialStats) {
    return (
      <div className="book-info">
        <div className="pt-3 text-base font-semibold text-light-100 sm:pt-4 sm:text-lg">
          Borrow Statistics
        </div>
        <div className="space-y-2 sm:space-y-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-12 lg:gap-24">
            <Skeleton className="h-5 w-full sm:h-6 sm:w-48" />
            <Skeleton className="h-5 w-full sm:h-6 sm:w-48" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-12 lg:gap-24">
            <Skeleton className="h-5 w-full sm:h-6 sm:w-48" />
            <Skeleton className="h-5 w-full sm:h-6 sm:w-48" />
          </div>
        </div>
      </div>
    );
  }

  // Show error state (fallback to initial stats if available)
  if (isError && !initialStats) {
    return (
      <div className="book-info">
        <div className="pt-3 text-base font-semibold text-light-100 sm:pt-4 sm:text-lg">
          Borrow Statistics
        </div>
        <div className="space-y-2 sm:space-y-3">
          <p className="text-xs text-red-400 sm:text-sm">
            Failed to load borrow statistics
          </p>
        </div>
      </div>
    );
  }

  if (!statsData) {
    return null;
  }

  return (
    <div className="book-info">
      <div className="pt-3 text-base font-semibold text-light-100 sm:pt-4 sm:text-lg">
        Borrow Statistics
      </div>
      <div className="space-y-2 sm:space-y-3">
        {/* Borrow counts */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-12 lg:gap-24">
          <p className="text-sm sm:text-base">
            Total Times Borrowed{" "}
            <span className="font-semibold text-light-200">
              {statsData.totalBorrows || 0}
            </span>
          </p>
          <p className="text-sm sm:text-base">
            Currently Borrowed{" "}
            <span className="font-semibold text-light-200">
              {statsData.activeBorrows || 0}
            </span>
          </p>
        </div>

        {/* Availability status */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-12 lg:gap-24">
          <p className="text-sm sm:text-base">
            Availability Status{" "}
            <span
              className={`font-semibold ${
                availableCopies > 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {availableCopies > 0 ? "Available" : "Unavailable"}
            </span>
          </p>
          <p className="text-sm sm:text-base">
            Successfully Returned{" "}
            <span className="font-semibold text-light-200">
              {statsData.returnedBorrows || 0}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookBorrowStats;

