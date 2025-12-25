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

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import BookCover from "@/components/BookCover";
import { useAllBooks } from "@/hooks/useQueries";
import { getBookGenres } from "@/lib/services/books";
import BookCardSkeleton from "@/components/skeletons/BookCardSkeleton";
import type { BookFilters } from "@/lib/services/books";

interface AdminBooksListProps {
  /**
   * Initial books data from SSR (prevents duplicate fetch)
   */
  initialBooks?: Book[];
}

const AdminBooksList: React.FC<AdminBooksListProps> = ({ initialBooks }) => {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const queryClient = useQueryClient();

  // Get current search params from URL
  const currentSearch = searchParamsHook.get("search") || "";
  const currentGenre = searchParamsHook.get("genre") || "all";
  const currentAvailability = searchParamsHook.get("availability") || "all";

  const [localSearch, setLocalSearch] = useState(currentSearch);
  const [genres, setGenres] = useState<string[]>([]);
  const lastSyncedSearchRef = React.useRef(currentSearch);

  // Sync localSearch with URL params when they change externally (e.g., browser back/forward)
  // Only sync if the change didn't come from our own debounced update
  React.useEffect(() => {
    // Only sync if:
    // 1. currentSearch changed from an external source (not our debounce)
    // 2. localSearch matches the last synced value (user isn't actively typing)
    // This prevents overwriting user input while typing
    if (
      currentSearch !== lastSyncedSearchRef.current &&
      localSearch === lastSyncedSearchRef.current
    ) {
      setLocalSearch(currentSearch);
      lastSyncedSearchRef.current = currentSearch;
    }
  }, [currentSearch, localSearch]);

  // Fetch genres on mount
  React.useEffect(() => {
    getBookGenres()
      .then((genresList) => setGenres(genresList))
      .catch((error) => console.error("Error fetching genres:", error));
  }, []);

  // Debounce search input for instant filtering
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== currentSearch) {
        const params = new URLSearchParams(searchParamsHook.toString());
        const trimmedSearch = localSearch.trim();

        if (trimmedSearch) {
          params.set("search", trimmedSearch);
        } else {
          params.delete("search");
        }

        const newUrl = `/admin/books?${params.toString()}`;
        // Update ref before navigation to prevent sync effect from overwriting
        lastSyncedSearchRef.current = trimmedSearch;
        queryClient.invalidateQueries({ queryKey: ["all-books"] });
        router.replace(newUrl, { scroll: false });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, searchParamsHook, queryClient, router]);

  // Build filters from URL params
  const filters: BookFilters = React.useMemo(
    () => ({
      search: currentSearch || undefined,
      genre: currentGenre !== "all" ? currentGenre : undefined,
      availability:
        currentAvailability !== "all"
          ? (currentAvailability as BookFilters["availability"])
          : undefined,
      limit: 1000, // High limit to get all books
      page: 1,
    }),
    [currentSearch, currentGenre, currentAvailability]
  );

  // Check if any filters are active
  const hasActiveFilters =
    currentSearch || currentGenre !== "all" || currentAvailability !== "all";

  // Only use initialData on first load (when no filters are active)
  const initialBooksData =
    !hasActiveFilters && initialBooks
      ? {
          books: initialBooks,
          total: initialBooks.length,
          page: 1,
          totalPages: 1,
          limit: initialBooks.length,
        }
      : undefined;

  // Use React Query hook with SSR initial data
  const {
    data: booksData,
    isLoading,
    isError,
    error,
  } = useAllBooks(filters, initialBooksData);

  // CRITICAL: Always prefer React Query data over initial data
  // React Query data is fresh and updates immediately after mutations
  // initial data is only used as fallback during initial load
  // Extract books from response with proper typing
  // Book is a global type from types.d.ts
  const allBooks: Book[] = ((booksData?.books ?? initialBooks) || []) as Book[];

  // Update search params in URL and trigger refetch
  const updateSearchParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParamsHook.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    queryClient.invalidateQueries({ queryKey: ["all-books"] });
    router.replace(`/admin/books?${params.toString()}`, { scroll: false });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateSearchParams({ [key]: value });
  };

  const clearFilters = () => {
    setLocalSearch("");
    router.push("/admin/books");
  };

  // Show skeleton while loading (only if no initial data)
  if (isLoading && (!initialBooks || initialBooks.length === 0)) {
    return (
      <section className="w-full rounded-2xl bg-white p-4 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold sm:text-xl">All Books</h2>
          <Button className="bg-primary-admin" asChild>
            <Link href="/admin/books/new" className="text-white">
              + Create a New Book
            </Link>
          </Button>
        </div>

        <div className="mt-4 w-full overflow-hidden sm:mt-7">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      <section className="w-full rounded-2xl bg-white p-4 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold sm:text-xl">All Books</h2>
          <Button className="bg-primary-admin" asChild>
            <Link href="/admin/books/new" className="text-white">
              + Create a New Book
            </Link>
          </Button>
        </div>

        <div className="mt-4 w-full overflow-hidden sm:mt-7">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
              Failed to load books
            </p>
            <p className="text-xs text-gray-500 sm:text-sm">
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
    <section className="w-full rounded-2xl bg-white p-4 sm:p-7">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h2 className="text-lg font-semibold text-dark-400 sm:text-xl">
          All Books ({allBooks.length})
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmedSearch = localSearch.trim();
              updateSearchParams({ search: trimmedSearch });
            }}
            className="flex-1 sm:min-w-[250px]"
          >
            <Input
              type="text"
              placeholder="Search books..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-dark-400 placeholder:text-gray-500 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </form>
          {/* Filter Dropdowns */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm text-dark-400">Genre:</span>
              <select
                value={currentGenre}
                onChange={(e) => handleFilterChange("genre", e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-dark-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 sm:min-w-[170px]"
              >
                <option value="all">All</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm text-dark-400">Availability:</span>
              <select
                value={currentAvailability}
                onChange={(e) =>
                  handleFilterChange("availability", e.target.value)
                }
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-dark-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 sm:min-w-[170px]"
              >
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button className="bg-primary-admin" asChild>
          <Link href="/admin/books/new" className="text-white">
            + Create a New Book
          </Link>
        </Button>
      </div>

      <div className="mt-4 w-full overflow-hidden sm:mt-7">
        {allBooks.length === 0 ? (
          <div className="py-6 text-center sm:py-8">
            <p className="mb-4 text-base font-medium text-gray-600 sm:text-lg">
              {hasActiveFilters
                ? "No books found matching your criteria."
                : "No books found. Create your first book!"}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="mt-2 border-gray-300 text-dark-400 hover:bg-gray-100"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allBooks.map((book) => (
              <div
                key={book.id}
                className="rounded-lg border border-gray-200 p-3 transition-shadow hover:shadow-md sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                  <BookCover
                    coverColor={book.coverColor}
                    coverImage={book.coverUrl}
                    className="h-16 w-12 sm:h-20 sm:w-16"
                  />

                  <div className="flex-1">
                    <h3 className="line-clamp-2 text-base font-semibold sm:text-lg">
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

                    <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row">
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
