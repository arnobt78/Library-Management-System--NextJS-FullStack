"use client";

/**
 * BookDetailContent Component
 *
 * Client component that displays book details, video, summary, and reviews.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useBook and useBookReviews hooks with initialData from SSR
 * - Displays skeleton loaders while fetching
 * - Shows error state if fetch fails
 * - Integrates with BookOverview, BookVideo, and ReviewsSection components
 */

import React from "react";
import BookVideo from "@/components/BookVideo";
import ReviewsSection from "@/components/ReviewsSection";
import BookSkeleton from "@/components/skeletons/BookSkeleton";
import { useBook, useBookReviews } from "@/hooks/useQueries";

interface BookDetailContentProps {
  /**
   * Book ID
   */
  bookId: string;
  /**
   * User ID for book overview
   */
  userId?: string;
  /**
   * User email for reviews section
   */
  userEmail?: string;
  /**
   * Initial book data from SSR (prevents duplicate fetch)
   */
  initialBook?: Book;
  /**
   * Initial reviews data from SSR (prevents duplicate fetch)
   */
  initialReviews?: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    userFullName: string;
    userEmail: string;
  }>;
}

const BookDetailContent: React.FC<BookDetailContentProps> = ({
  bookId,
  userId: _userId,
  userEmail,
  initialBook,
  initialReviews,
}) => {
  // Use React Query hooks with SSR initial data
  const {
    data: book,
    isLoading: isLoadingBook,
    isError: isErrorBook,
    error: bookError,
  } = useBook(bookId, initialBook);

  const {
    data: reviews,
    isLoading: isLoadingReviews,
    isError: isErrorReviews,
    error: reviewsError,
  } = useBookReviews(bookId, initialReviews);

  // Show skeleton while loading (only if no initial data)
  if (
    (isLoadingBook && !initialBook) ||
    (isLoadingReviews && !initialReviews)
  ) {
    return <BookSkeleton showDetails={true} />;
  }

  // Show error state for book
  if (isErrorBook || !book) {
    return (
      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
        <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-center sm:p-8">
          <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
            Failed to load book
          </p>
          <p className="text-xs text-gray-500 sm:text-sm">
            {bookError instanceof Error
              ? bookError.message
              : "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  // CRITICAL: Always prefer React Query data over initialBook
  // React Query data is fresh and updates immediately after mutations
  // initialBook is only used as fallback during initial load
  const bookData = book ?? initialBook;

  if (!bookData) {
    return null;
  }

  return (
    <div className="book-details">
      <div className="flex-[1.5] w-full min-w-0 max-w-full overflow-hidden">
        {/* Video Section */}
        <section className="flex flex-col gap-4 sm:gap-7">
          <h3 className="text-base font-semibold text-primary sm:text-lg">Video</h3>
          <BookVideo videoUrl={bookData.videoUrl} />
        </section>

        {/* Summary Section */}
        <section className="mt-6 flex flex-col gap-4 sm:mt-10 sm:gap-7">
          <h3 className="text-base font-semibold text-primary sm:text-lg">Summary</h3>
          <div className="space-y-3 text-base text-light-100 sm:space-y-5 sm:text-xl break-words">
            {bookData.summary?.split("\n").map((line: string, i: number) => (
              <p key={i} className="break-words">{line}</p>
            ))}
          </div>
        </section>

        {/* Reviews Section */}
        <section className="mt-6 flex flex-col gap-4 sm:mt-10 sm:gap-7">
          {/* CRITICAL: Pass React Query data to ReviewsSection
              React Query data updates immediately after mutations
              initialReviews is only used as fallback during initial load */}
          <ReviewsSection
            bookId={bookId}
            reviews={reviews ?? initialReviews ?? []}
            currentUserEmail={userEmail}
          />
          {/* Show error message for reviews if failed but book loaded */}
          {isErrorReviews && (
            <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-3 text-yellow-800 sm:p-4">
              <p className="text-sm font-semibold sm:text-base">Failed to load reviews</p>
              <p className="text-xs sm:text-sm">
                {reviewsError instanceof Error
                  ? reviewsError.message
                  : "An unknown error occurred"}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* SIMILAR - Can be added later */}
    </div>
  );
};

export default BookDetailContent;
