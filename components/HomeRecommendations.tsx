"use client";

/**
 * HomeRecommendations Component
 *
 * Client component that displays book recommendations on the home page.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useBookRecommendations hook with initialData from SSR
 * - Displays skeleton loaders while fetching
 * - Shows error state if fetch fails
 * - Integrates with BookList component for display
 */

import React from "react";
import BookList from "@/components/BookList";
import BookCardSkeleton from "@/components/skeletons/BookCardSkeleton";
import { useBookRecommendations } from "@/hooks/useQueries";

interface HomeRecommendationsProps {
  /**
   * Initial recommended books from SSR (prevents duplicate fetch)
   */
  initialRecommendations: Book[];
  /**
   * User ID for personalized recommendations
   */
  userId?: string;
  /**
   * Limit for number of recommendations
   * @default 6
   */
  limit?: number;
}

const HomeRecommendations: React.FC<HomeRecommendationsProps> = ({
  initialRecommendations,
  userId,
  limit = 6,
}) => {
  // Use React Query hook with SSR initial data
  const {
    data: recommendedBooks,
    isLoading,
    isError,
    error,
  } = useBookRecommendations(userId, limit, initialRecommendations);

  // Show skeleton while loading (only if no initial data)
  if (
    isLoading &&
    (!initialRecommendations || initialRecommendations.length === 0)
  ) {
    return (
      <section className="mt-12 sm:mt-24">
        <h2 className="font-bebas-neue text-2xl text-light-100 sm:text-4xl">
          Book Recommendations
        </h2>
        <ul className="book-list">
          {[...Array(6)].map((_, index) => (
            <BookCardSkeleton key={`skeleton-${index}`} />
          ))}
        </ul>
      </section>
    );
  }

  // Show error state
  if (isError) {
    return (
      <section className="mt-12 sm:mt-24">
        <h2 className="font-bebas-neue text-2xl text-light-100 sm:text-4xl">
          Book Recommendations
        </h2>
        <div className="mt-3 rounded-lg border border-red-500 bg-red-50 p-3 text-red-800 sm:mt-4 sm:p-4">
          <p className="text-sm font-semibold sm:text-base">Failed to load recommendations</p>
          <p className="text-xs sm:text-sm">
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </p>
        </div>
      </section>
    );
  }

  // CRITICAL: Always prefer React Query data over initialRecommendations
  // React Query data is fresh and updates immediately after mutations
  // initialRecommendations is only used as fallback during initial load
  const books = recommendedBooks ?? initialRecommendations ?? [];

  return (
    <BookList
      title="Book Recommendations"
      books={books}
      containerClassName="mt-12 sm:mt-24"
      showViewAllButton={true}
    />
  );
};

export default HomeRecommendations;
