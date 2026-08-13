"use client";

/**
 * BookOverviewContent Component
 *
 * Client component that displays book overview information.
 * Uses React Query to fetch book data dynamically, ensuring immediate updates.
 *
 * Layout (REQ-0033 polish):
 * - Full-width header: title + author/category/rating span above columns
 * - Body: details left / hero right at md+; below md order is title → hero → details
 * - Soft cover-tinted hero glow sits behind BookCover (disabled under reduced-motion)
 *
 * Features:
 * - Uses useBook hook to fetch book data with SSR initial data support
 * - Displays all book information including availableCopies, totalCopies, isActive
 * - Updates immediately when book data changes (via cache invalidation)
 * - Integrates with BookBorrowStats and BookBorrowButton for dynamic updates
 */

import React from "react";
import BookCover from "@/components/BookCover";
import BookBorrowStats from "@/components/BookBorrowStats";
import BookBorrowButton from "@/components/BookBorrowButton";
import { Button } from "@/components/ui/button";
import { BookOpen, Star } from "lucide-react";
import Link from "next/link";
import { useBook } from "@/hooks/useQueries";
import BookSkeleton from "@/components/skeletons/BookSkeleton";
import type { BorrowRecord } from "@/lib/services/borrows";
import type { ReviewEligibility } from "@/lib/services/reviews";
import type { UserReservationItem } from "@/lib/services/reservations";

interface BookOverviewContentProps {
  /**
   * Book ID
   */
  bookId: string;
  /**
   * User ID
   */
  userId: string;
  /**
   * User status (APPROVED, PENDING, etc.)
   */
  userStatus?: string | null;
  /**
   * Whether this is a detail page
   */
  isDetailPage?: boolean;
  /**
   * Initial book data from SSR (prevents duplicate fetch)
   */
  initialBook: Book;
  /**
   * Initial borrow statistics from SSR (prevents duplicate fetch)
   */
  initialStats?: {
    totalBorrows: number;
    activeBorrows: number;
    returnedBorrows: number;
  };
  /**
   * Initial user borrows from SSR (prevents duplicate fetch, ensures correct button state on first load)
   */
  initialUserBorrows?: BorrowRecord[];
  /**
   * SSR reservations — Waitlisted CTA without Join Waitlist flash.
   */
  initialReservations?: UserReservationItem[];
  /**
   * Initial review eligibility from SSR (prevents duplicate fetch, ensures correct button state on first load)
   */
  initialReviewEligibility?: ReviewEligibility;
}

const BookOverviewContent: React.FC<BookOverviewContentProps> = ({
  bookId,
  userId,
  userStatus,
  isDetailPage = false,
  initialBook,
  initialStats,
  initialUserBorrows,
  initialReservations,
  initialReviewEligibility,
}) => {
  // Use React Query hook with SSR initial data
  const {
    data: book,
    isLoading,
    isError,
    error,
  } = useBook(bookId, initialBook);

  // Show skeleton while loading (only if no initial data)
  if (isLoading && !initialBook) {
    return <BookSkeleton showDetails={false} />;
  }

  // Show error state
  if (isError && !initialBook) {
    return (
      <div className="w-full">
        <div className="empty-panel rounded-lg border border-red-500 bg-red-50">
          <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
            Failed to load book
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

  // CRITICAL: Always prefer React Query data over initialBook
  // React Query data is fresh and updates immediately after mutations
  // initialBook is only used as fallback during initial load
  const bookData = book ?? initialBook;

  if (!bookData) {
    return null;
  }

  const {
    title,
    author,
    genre,
    rating,
    totalCopies,
    availableCopies,
    description,
    coverColor,
    coverUrl,
    id,
    isbn,
    publicationYear,
    publisher,
    language,
    pageCount,
    edition,
    isActive,
    createdAt,
    updatedAt,
  } = bookData;

  return (
    <section className="book-overview">
      {/* Full-bleed title row — not constrained to the details column */}
      <header className="book-overview__header">
        <h1 className="break-words">{title}</h1>

        <div className="book-info mt-3 sm:mt-5">
          <p>
            By <span className="font-medium text-light-200">{author}</span>
          </p>

          <div className="flex flex-row flex-wrap items-center gap-2">
            <p className="break-words">
              Category{" "}
              <span className="font-medium text-light-200">{genre}</span>
            </p>

            <div className="flex shrink-0 flex-row items-center gap-1">
              <Star
                className="size-4 shrink-0 fill-light-100 text-light-100 sm:size-[22px]"
                aria-hidden
              />
              <p>{rating}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="book-overview__body">
        <div className="book-overview__details">
          {/* Enhanced Book Information */}
          <div className="pt-3 text-base font-medium text-light-100 sm:pt-4 sm:text-lg">
            Book Details
          </div>
          <div className="book-info">
            <div className="space-y-2 sm:space-y-2">
              {/* First row: ISBN and Published */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:gap-12 xl:gap-36">
                <p>
                  ISBN{" "}
                  <span className="font-medium text-light-200">
                    {isbn || "N/A"}
                  </span>
                </p>
                <p>
                  Published{" "}
                  <span className="font-medium text-light-200">
                    {publicationYear || "N/A"}
                  </span>
                </p>
              </div>

              {/* Second row: Publisher and Language */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:gap-12 xl:gap-36">
                <p>
                  Publisher{" "}
                  <span className="font-medium text-light-200">
                    {publisher || "N/A"}
                  </span>
                </p>
                <p>
                  Language{" "}
                  <span className="font-medium text-light-200">
                    {language || "N/A"}
                  </span>
                </p>
              </div>

              {/* Third row: Pages and Edition */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:gap-12 xl:gap-36">
                <p>
                  Pages{" "}
                  <span className="font-medium text-light-200">
                    {pageCount || "N/A"}
                  </span>
                </p>
                <p>
                  Edition{" "}
                  <span className="font-medium text-light-200">
                    {edition || "N/A"}
                  </span>
                </p>
              </div>

              {/* Fourth row: Total Copies and Available Copies */}
              <div className="">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:gap-12 xl:gap-36">
                  <p>
                    Total Books{" "}
                    <span className="font-medium text-light-200">
                      {totalCopies || "N/A"}
                    </span>
                  </p>
                  <p>
                    Available Books{" "}
                    <span className="font-medium text-light-200">
                      {availableCopies || "N/A"}
                    </span>
                  </p>
                </div>

                {!isActive && (
                  <p className="mt-2 text-sm font-medium text-red-400 sm:text-base">
                    ⚠️ This book is currently unavailable
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Database Metadata — same row/grid classes as Borrow Statistics */}
          <div className="book-info">
            <div className="pt-3 text-base font-medium text-light-100 sm:pt-4 sm:text-lg">
              Library Database Information
            </div>
            <div className="w-full space-y-2 sm:space-y-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-12 lg:gap-24">
                <p className="text-sm sm:text-base">
                  Added to Library{" "}
                  <span className="font-medium text-light-200">
                    {createdAt
                      ? new Date(createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </span>
                </p>
                <p className="text-sm sm:text-base">
                  Last Updated{" "}
                  <span className="font-medium text-light-200">
                    {updatedAt
                      ? new Date(updatedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Borrow Statistics — RQ invalidation keeps counts live without refresh */}
          <BookBorrowStats
            bookId={id}
            initialBook={bookData}
            initialStats={initialStats}
          />

          <p className="book-description">{description}</p>

          {userId && (
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              {isDetailPage ? (
                <BookBorrowButton
                  bookId={id}
                  userId={userId}
                  bookTitle={title}
                  bookCoverUrl={coverUrl}
                  bookCoverColor={coverColor}
                  bookAuthor={author}
                  bookGenre={genre}
                  bookRating={rating}
                  availableCopies={availableCopies}
                  isActive={isActive}
                  userStatus={userStatus}
                  isDetailPage={true}
                  initialUserBorrows={initialUserBorrows}
                  initialReservations={initialReservations}
                  initialReviewEligibility={initialReviewEligibility}
                />
              ) : (
                <>
                  <BookBorrowButton
                    bookId={id}
                    userId={userId}
                    bookTitle={title}
                    bookCoverUrl={coverUrl}
                    bookCoverColor={coverColor}
                    bookAuthor={author}
                    bookGenre={genre}
                    bookRating={rating}
                    availableCopies={availableCopies}
                    isActive={isActive}
                    userStatus={userStatus}
                    isDetailPage={false}
                    initialUserBorrows={initialUserBorrows}
                    initialReservations={initialReservations}
                    initialReviewEligibility={initialReviewEligibility}
                  />
                  <span className="cta-shine-wrap mt-0 w-full sm:mt-4 sm:w-fit">
                    <Button
                      asChild
                      className="cta-shine-button hover:bg-primary/90 min-h-14 w-full bg-primary text-dark-100"
                    >
                      <Link
                        href={`/books/${id}`}
                        className="inline-flex items-center justify-center gap-2"
                      >
                        <BookOpen className="size-4 text-dark-100 sm:size-5" />
                        <span className="font-bebas-neue text-base text-dark-100 sm:text-xl">
                          Book Details
                        </span>
                      </Link>
                    </Button>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="book-overview__hero">
          {/* Cover-tinted radial glow (CSS); --cover-glow set from book coverColor */}
          <div
            className="book-overview__hero-glow"
            style={
              {
                ["--cover-glow" as string]: coverColor || "#e7c9a5",
              } as React.CSSProperties
            }
            aria-hidden
          />

          <div className="relative z-10">
            <BookCover
              variant="wide"
              className="z-10"
              coverColor={coverColor}
              coverImage={coverUrl}
            />

            <div className="absolute left-16 top-10 rotate-12 opacity-40 max-sm:hidden">
              <BookCover
                variant="wide"
                coverColor={coverColor}
                coverImage={coverUrl}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookOverviewContent;
