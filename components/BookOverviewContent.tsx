"use client";

/**
 * BookOverviewContent Component
 *
 * Client component that displays book overview information.
 * Uses React Query to fetch book data dynamically, ensuring immediate updates.
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
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useBook } from "@/hooks/useQueries";
import BookSkeleton from "@/components/skeletons/BookSkeleton";

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
}

const BookOverviewContent: React.FC<BookOverviewContentProps> = ({
  bookId,
  userId,
  userStatus,
  isDetailPage = false,
  initialBook,
  initialStats,
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
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-lg border border-red-500 bg-red-50 p-8 text-center">
          <p className="mb-2 text-lg font-semibold text-red-500">
            Failed to load book
          </p>
          <p className="text-sm text-gray-500">
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
      <div className="flex flex-1 flex-col gap-5">
        <h1>{title}</h1>

        <div className="book-info">
          <p>
            By <span className="font-semibold text-light-200">{author}</span>
          </p>

          <p>
            Category{" "}
            <span className="font-semibold text-light-200">{genre}</span>
          </p>

          <div className="flex flex-row gap-1">
            <img src="/icons/star.svg" alt="star" width={22} height={22} />
            <p>{rating}</p>
          </div>
        </div>

        {/* Enhanced Book Information */}
        <div className="pt-4 text-lg font-semibold text-light-100">
          Book Details
        </div>
        <div className="book-info">
          <div className="space-y-3">
            {/* First row: ISBN and Published */}
            <div className="grid grid-cols-2 gap-36">
              <p>
                ISBN{" "}
                <span className="font-semibold text-light-200">
                  {isbn || "N/A"}
                </span>
              </p>
              <p>
                Published{" "}
                <span className="font-semibold text-light-200">
                  {publicationYear || "N/A"}
                </span>
              </p>
            </div>

            {/* Second row: Publisher and Language */}
            <div className="grid grid-cols-2 gap-36">
              <p>
                Publisher{" "}
                <span className="font-semibold text-light-200">
                  {publisher || "N/A"}
                </span>
              </p>
              <p>
                Language{" "}
                <span className="font-semibold text-light-200">
                  {language || "N/A"}
                </span>
              </p>
            </div>

            {/* Third row: Pages and Edition */}
            <div className="grid grid-cols-2 gap-36">
              <p>
                Pages{" "}
                <span className="font-semibold text-light-200">
                  {pageCount || "N/A"}
                </span>
              </p>
              <p>
                Edition{" "}
                <span className="font-semibold text-light-200">
                  {edition || "N/A"}
                </span>
              </p>
            </div>

            {/* Fourth row: Total Copies and Available Copies */}
            <div className="">
              <div className="grid grid-cols-2 gap-36">
                <p>
                  Total Books{" "}
                  <span className="font-semibold text-light-200">
                    {totalCopies || "N/A"}
                  </span>
                </p>
                <p>
                  Available Books{" "}
                  <span className="font-semibold text-light-200">
                    {availableCopies || "N/A"}
                  </span>
                </p>
              </div>

              {!isActive && (
                <p className="font-semibold text-red-400">
                  ⚠️ This book is currently unavailable
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Database Metadata Section */}
        <div className="book-info">
          <div className="pt-4 text-lg font-semibold text-light-100">
            Library Database Information
          </div>
          <div className="space-y-3">
            {/* Database dates */}
            <div className="grid grid-cols-2 gap-12">
              <p>
                Added to Library{" "}
                <span className="font-semibold text-light-200">
                  {createdAt
                    ? new Date(createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </span>
              </p>
              <p>
                Last Updated{" "}
                <span className="font-semibold text-light-200">
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

        {/* Borrow Statistics Section - Uses React Query for immediate updates */}
        <BookBorrowStats
          bookId={id}
          initialBook={bookData} // Pass book data so BookBorrowStats can get availableCopies from React Query
          initialStats={initialStats} // Pass SSR stats for immediate display (React Query will update if needed)
        />

        <p className="book-description">{description}</p>

        {userId && (
          <div className="flex gap-4">
            {/* Use Client Component for borrow button logic - updates immediately */}
            {isDetailPage ? (
              <BookBorrowButton
                bookId={id}
                userId={userId}
                bookTitle={title}
                availableCopies={availableCopies}
                isActive={isActive}
                userStatus={userStatus}
                isDetailPage={true}
              />
            ) : (
              <>
                <BookBorrowButton
                  bookId={id}
                  userId={userId}
                  bookTitle={title}
                  availableCopies={availableCopies}
                  isActive={isActive}
                  userStatus={userStatus}
                  isDetailPage={false}
                />
                <Button
                  asChild
                  className="hover:bg-primary/90 mt-4 min-h-14 w-fit bg-primary text-dark-100 max-md:w-full"
                >
                  <Link href={`/books/${id}`}>
                    <BookOpen className="size-5 text-dark-100" />
                    <p className="font-bebas-neue text-xl text-dark-100">
                      Book Details
                    </p>
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="relative flex flex-1 justify-center">
        <div className="relative">
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
    </section>
  );
};

export default BookOverviewContent;

