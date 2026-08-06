"use client";

/**
 * RelatedBookRecommendations
 *
 * Detail-page strip mirroring HomeRecommendations: SSR initialData + RQ
 * genre-related books (excludes current book). Invalidates with books/related keys.
 * Spacing: mt-6/sm:mt-10 (matches detail Video/Summary; book-details is pt-only).
 */

import React from "react";
import BookList from "@/components/BookList";
import BookCardSkeleton from "@/components/skeletons/BookCardSkeleton";
import { useRelatedBooks } from "@/hooks/useQueries";

interface RelatedBookRecommendationsProps {
  bookId: string;
  initialRelated: Book[];
  limit?: number;
}

const RelatedBookRecommendations: React.FC<RelatedBookRecommendationsProps> = ({
  bookId,
  initialRelated,
  limit = 6,
}) => {
  const {
    data: relatedBooks,
    isLoading,
    isError,
    error,
  } = useRelatedBooks(bookId, limit, initialRelated);

  if (isLoading && (!initialRelated || initialRelated.length === 0)) {
    return (
      <section className="mt-6 sm:mt-10">
        <h2 className="font-bebas-neue text-xl text-light-100 sm:text-3xl">
          Related Recommendations
        </h2>
        <ul className="book-list">
          {[...Array(6)].map((_, index) => (
            <BookCardSkeleton key={`related-skeleton-${index}`} />
          ))}
        </ul>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mt-6 sm:mt-10">
        <h2 className="font-bebas-neue text-xl text-light-100 sm:text-3xl">
          Related Recommendations
        </h2>
        <div className="mt-3 rounded-lg border border-red-500 bg-red-50 p-3 text-red-800 sm:mt-4 sm:p-4">
          <p className="text-sm font-medium sm:text-base">
            Failed to load related books
          </p>
          <p className="text-xs sm:text-sm">
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </p>
        </div>
      </section>
    );
  }

  // Prefer RQ data so book mutations refresh this strip without a hard reload
  const books = relatedBooks ?? initialRelated ?? [];

  if (books.length === 0) {
    return null;
  }

  return (
    <BookList
      title="Related Recommendations"
      books={books}
      containerClassName="mt-6 sm:mt-10"
      showViewAllButton={true}
    />
  );
};

export default RelatedBookRecommendations;
