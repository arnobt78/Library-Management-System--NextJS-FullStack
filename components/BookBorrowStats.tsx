"use client";

/**
 * BookBorrowStats Component
 *
 * Client component that displays borrow statistics for a specific book.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useBookBorrowStats and useBook hooks with initialData from SSR
 * - Two-column label/value grid (matches Book Details rows at sm+)
 * - Availability cue: Available (emerald) / Low (amber) / Unavailable (red)
 * - Updates immediately when borrows change (via cache invalidation)
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

/** Status label + Tailwind class from available/total copy counts */
function getAvailabilityStatus(
  availableCopies: number,
  totalCopies: number
): { label: "Available" | "Low" | "Unavailable"; className: string } {
  if (availableCopies <= 0) {
    return { label: "Unavailable", className: "text-red-400" };
  }

  const lowByCount = availableCopies <= 2;
  const lowByShare =
    totalCopies > 0 && availableCopies <= Math.max(1, Math.floor(totalCopies * 0.1));

  if (lowByCount || lowByShare) {
    return { label: "Low", className: "text-amber-300/90" };
  }

  return { label: "Available", className: "text-emerald-300" };
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
  const availableCopies =
    book?.availableCopies ??
    initialBook?.availableCopies ??
    propAvailableCopies ??
    0;

  const totalCopies =
    book?.totalCopies ?? initialBook?.totalCopies ?? 0;

  const isLoading = bookLoading || statsLoading;

  // Show skeleton while loading (only if no initial data)
  if (isLoading && !initialStats) {
    return (
      <div className="book-info">
        <div className="pt-3 text-base font-semibold text-light-100 sm:pt-4 sm:text-lg">
          Borrow Statistics
        </div>
        <div className="w-full space-y-2 sm:space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-12 lg:gap-24">
            <Skeleton className="h-5 w-full max-w-xs sm:h-6" />
            <Skeleton className="h-5 w-full max-w-xs sm:h-6" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-12 lg:gap-24">
            <Skeleton className="h-5 w-full max-w-sm sm:h-6" />
            <Skeleton className="h-5 w-full max-w-xs sm:h-6" />
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

  const availability = getAvailabilityStatus(availableCopies, totalCopies);

  return (
    <div className="book-info">
      <div className="pt-3 text-base font-semibold text-light-100 sm:pt-4 sm:text-lg">
        Borrow Statistics
      </div>
      {/* Two-column rows — same grid pattern as Book Details above */}
      <div className="w-full space-y-2 sm:space-y-3">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-12 lg:gap-24">
          <p className="text-sm sm:text-base">
            Availability Status{" "}
            <span className={`font-semibold ${availability.className}`}>
              {availability.label}
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
