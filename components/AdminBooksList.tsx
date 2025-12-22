"use client";

/**
 * AdminBooksList Component
 *
 * Client component that displays all books in a grid layout for admin management.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useAllBooks hook with initialData from SSR
 * - Displays skeleton loaders while fetching
 * - Shows error state if fetch fails
 * - Displays books in a responsive grid layout
 * - Shows book details, status, and action buttons
 */

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import BookCover from "@/components/BookCover";
import { useAllBooks } from "@/hooks/useQueries";
import BookCardSkeleton from "@/components/skeletons/BookCardSkeleton";

interface AdminBooksListProps {
  /**
   * Initial books data from SSR (prevents duplicate fetch)
   */
  initialBooks?: Book[];
}

const AdminBooksList: React.FC<AdminBooksListProps> = ({ initialBooks }) => {
  // Use React Query hook with SSR initial data
  // CRITICAL: Explicitly set limit to a high number to get ALL books (no pagination)
  // Without this, URL params or defaults would apply pagination (page 1, limit 12)
  const {
    data: booksData,
    isLoading,
    isError,
    error,
  } = useAllBooks(
    {
      // No filters - get all books
      // Set a high limit to ensure we get all books (admin needs to see everything)
      limit: 1000, // High limit to get all books
      page: 1,
    },
    initialBooks
      ? {
          books: initialBooks,
          total: initialBooks.length,
          page: 1,
          totalPages: 1,
          limit: initialBooks.length,
        }
      : undefined
  );

  // CRITICAL: Always prefer React Query data over initial data
  // React Query data is fresh and updates immediately after mutations
  // initial data is only used as fallback during initial load
  // Extract books from response with proper typing
  // Book is a global type from types.d.ts
  const allBooks: Book[] = ((booksData?.books ?? initialBooks) || []) as Book[];

  // Show skeleton while loading (only if no initial data)
  if (isLoading && (!initialBooks || initialBooks.length === 0)) {
    return (
      <section className="w-full rounded-2xl bg-white p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">All Books</h2>
          <Button className="bg-primary-admin" asChild>
            <Link href="/admin/books/new" className="text-white">
              + Create a New Book
            </Link>
          </Button>
        </div>

        <div className="mt-7 w-full overflow-hidden">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <BookCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (isError && (!initialBooks || initialBooks.length === 0)) {
    return (
      <section className="w-full rounded-2xl bg-white p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">All Books</h2>
          <Button className="bg-primary-admin" asChild>
            <Link href="/admin/books/new" className="text-white">
              + Create a New Book
            </Link>
          </Button>
        </div>

        <div className="mt-7 w-full overflow-hidden">
          <div className="py-8 text-center">
            <p className="mb-2 text-lg font-semibold text-red-500">
              Failed to load books
            </p>
            <p className="text-sm text-gray-500">
              {error instanceof Error
                ? error.message
                : "An unknown error occurred"}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full rounded-2xl bg-white p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">All Books ({allBooks.length})</h2>
        <Button className="bg-primary-admin" asChild>
          <Link href="/admin/books/new" className="text-white">
            + Create a New Book
          </Link>
        </Button>
      </div>

      <div className="mt-7 w-full overflow-hidden">
        {allBooks.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No books found. Create your first book!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allBooks.map((book) => (
              <div
                key={book.id}
                className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <BookCover
                    coverColor={book.coverColor}
                    coverImage={book.coverUrl}
                    className="h-20 w-16"
                  />

                  <div className="flex-1">
                    <h3 className="line-clamp-2 text-lg font-semibold">
                      {book.title}
                    </h3>
                    <p className="text-sm text-gray-600">by {book.author}</p>
                    <p className="mt-1 text-xs text-gray-500">{book.genre}</p>

                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Total Copies:</span>
                        <span className="font-medium">{book.totalCopies}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Available:</span>
                        <span
                          className={`font-medium ${
                            book.availableCopies > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {book.availableCopies}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Rating:</span>
                        <span className="font-medium">{book.rating}/5</span>
                      </div>

                      {/* Enhanced Information */}
                      {book.isbn && (
                        <div className="flex justify-between text-sm">
                          <span>ISBN:</span>
                          <span className="text-xs font-medium">
                            {book.isbn}
                          </span>
                        </div>
                      )}

                      {book.publicationYear && (
                        <div className="flex justify-between text-sm">
                          <span>Published:</span>
                          <span className="font-medium">
                            {book.publicationYear}
                          </span>
                        </div>
                      )}

                      {book.publisher && (
                        <div className="flex justify-between text-sm">
                          <span>Publisher:</span>
                          <span
                            className="max-w-20 truncate text-xs font-medium"
                            title={book.publisher}
                          >
                            {book.publisher}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm">
                        <span>Status:</span>
                        <span
                          className={`font-medium ${
                            book.isActive ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {book.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button size="sm" asChild>
                        <Link href={`/books/${book.id}`} className="text-white">
                          View Details
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/books/${book.id}/edit`}>
                          Edit Book
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminBooksList;
