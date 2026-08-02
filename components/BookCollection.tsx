"use client";

/**
 * BookCollection Component
 *
 * Client component that displays a collection of books with filters, search, sorting, and pagination.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useAllBooks hook with initialData from SSR
 * - Displays skeleton loaders while fetching
 * - Shows error state if fetch fails
 * - Handles URL-based search params for filters
 * - Supports pagination
 */

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BookCard from "@/components/BookCard";
import BookCardSkeleton from "@/components/skeletons/BookCardSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filter-select";
import {
  genreFilterOptions,
  availabilityFilterOptions,
  ratingFilterOptions,
  sortFilterOptions,
} from "@/lib/ui/filterOptionStyles";
import { useAllBooks } from "@/hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { BooksListResponse } from "@/lib/services/books";
import type { BorrowRecord } from "@/lib/services/borrows";
import {
  Search,
  FilterX,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

interface BookCollectionProps {
  /**
   * Initial books data from SSR (prevents duplicate fetch)
   */
  initialBooks?: Book[];
  /**
   * Initial genres list from SSR
   */
  initialGenres?: string[];
  /**
   * Initial pagination data from SSR
   */
  initialPagination?: {
    currentPage: number;
    totalPages: number;
    totalBooks: number;
    booksPerPage: number;
  };
  /**
   * Initial search params from SSR
   */
  initialSearchParams?: {
    search: string;
    genre: string;
    availability: string;
    rating: string;
    sort: string;
    page: number;
  };
  /**
   * Initial user borrows from SSR (populates React Query cache for faster navigation to book detail pages)
   */
  initialUserBorrows?: BorrowRecord[];
  /**
   * Legacy props for backward compatibility (deprecated, use initial* props instead)
   */
  books?: Book[];
  genres?: string[];
  searchParams?: {
    search: string;
    genre: string;
    availability: string;
    rating: string;
    sort: string;
    page: number;
  };
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalBooks: number;
    booksPerPage: number;
  };
}

const BookCollection: React.FC<BookCollectionProps> = ({
  initialBooks,
  initialGenres,
  initialPagination,
  initialSearchParams,
  initialUserBorrows,
  // Legacy props for backward compatibility
  books: legacyBooks,
  genres: legacyGenres,
  searchParams: legacySearchParams,
  pagination: legacyPagination,
}) => {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const queryClient = useQueryClient();

  // Initialize React Query cache with SSR user borrows data
  // This ensures that when users navigate to book detail pages, the data is already cached
  useEffect(() => {
    if (initialUserBorrows && initialUserBorrows.length > 0) {
      // Extract userId from first record (all records have same userId)
      const userId = initialUserBorrows[0].userId;
      if (userId) {
        // Set the query data in React Query cache for the main user-borrows query
        // This is the query key used by BookBorrowButton: ["user-borrows", userId, undefined]
        const queryKey = queryKeys.borrows.user(userId);
        queryClient.setQueryData(queryKey, initialUserBorrows);
      }
    }
  }, [initialUserBorrows, queryClient]);

  // Prepare initial data for React Query
  const initialData: BooksListResponse | undefined =
    initialBooks || legacyBooks
      ? {
          books: initialBooks || legacyBooks || [],
          total:
            initialPagination?.totalBooks ||
            legacyPagination?.totalBooks ||
            (initialBooks || legacyBooks || []).length,
          page:
            initialPagination?.currentPage ||
            legacyPagination?.currentPage ||
            1,
          totalPages:
            initialPagination?.totalPages || legacyPagination?.totalPages || 1,
          limit:
            initialPagination?.booksPerPage ||
            legacyPagination?.booksPerPage ||
            (initialBooks || legacyBooks || []).length,
        }
      : undefined;

  // Get search params from initial, legacy, or URL
  const searchParamsToUse = initialSearchParams ||
    legacySearchParams || {
      search: searchParamsHook.get("search") || "",
      genre: searchParamsHook.get("genre") || "",
      availability: searchParamsHook.get("availability") || "",
      rating: searchParamsHook.get("rating") || "",
      sort: searchParamsHook.get("sort") || "title",
      page: parseInt(searchParamsHook.get("page") || "1", 10),
    };

  // Use React Query hook with initialData
  const {
    data: booksData,
    isLoading,
    isError,
    error,
  } = useAllBooks(
    searchParamsToUse
      ? {
          search: searchParamsToUse.search || undefined,
          genre: searchParamsToUse.genre || undefined,
          availability:
            (searchParamsToUse.availability as
              "available" | "unavailable" | "all") || undefined,
          rating: searchParamsToUse.rating
            ? Number(searchParamsToUse.rating)
            : undefined,
          sort:
            (searchParamsToUse.sort as
              "title" | "author" | "rating" | "date") || undefined,
          page: searchParamsToUse.page,
          limit:
            initialPagination?.booksPerPage ||
            legacyPagination?.booksPerPage ||
            12,
        }
      : undefined,
    initialData,
  );

  // Use React Query data if available, otherwise fall back to legacy props or initial data
  // CRITICAL: Always prefer React Query data over initial/legacy data
  // React Query data is fresh and updates immediately after mutations
  // initial/legacy data is only used as fallback during initial load
  const books = (booksData?.books ?? legacyBooks ?? initialBooks) || [];
  const genres = (legacyGenres ?? initialGenres) || [];
  // CRITICAL: Always prefer React Query data over initial/legacy data
  // React Query data is fresh and updates immediately after mutations
  // initial/legacy data is only used as fallback during initial load
  const pagination = (legacyPagination ??
    initialPagination ??
    (booksData
      ? {
          currentPage: booksData.page ?? 1,
          totalPages: booksData.totalPages ?? 1,
          totalBooks: booksData.total ?? 0,
          booksPerPage: booksData.limit ?? 12,
        }
      : undefined)) || {
    currentPage: 1,
    totalPages: 1,
    totalBooks: books.length,
    booksPerPage: 12,
  };

  // Get current search params from URL or use initial/legacy
  const currentSearchParams = legacySearchParams ||
    initialSearchParams || {
      search: searchParamsHook.get("search") || "",
      genre: searchParamsHook.get("genre") || "",
      availability: searchParamsHook.get("availability") || "",
      rating: searchParamsHook.get("rating") || "",
      sort: searchParamsHook.get("sort") || "title",
      page: parseInt(searchParamsHook.get("page") || "1", 10),
    };

  const [localSearch, setLocalSearch] = useState(currentSearchParams.search);

  const updateSearchParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParamsHook.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Reset to page 1 when filters change
    if (Object.keys(newParams).some((key) => key !== "page")) {
      params.delete("page");
    }

    router.push(`/all-books?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParams({ search: localSearch });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateSearchParams({ [key]: value });
  };

  const handleSortChange = (sort: string) => {
    updateSearchParams({ sort });
  };

  const handlePageChange = (page: number) => {
    updateSearchParams({ page: page.toString() });
  };

  const clearFilters = () => {
    router.push("/all-books");
  };

  const hasActiveFilters =
    currentSearchParams.search ||
    currentSearchParams.genre ||
    currentSearchParams.availability ||
    currentSearchParams.rating;

  // Show skeleton while loading (only if no initial data)
  if (isLoading && (!initialBooks || initialBooks.length === 0)) {
    return (
      <div className="w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl font-semibold text-light-100 sm:text-3xl">
            Book Collection
          </h1>
          <p className="text-sm text-light-200 sm:text-base">
            Loading books...
          </p>
        </div>
        <div className="grid-cards grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(12)].map((_, index) => (
            <BookCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl font-semibold text-light-100 sm:text-3xl">
            Book Collection
          </h1>
        </div>
        <Card>
          <CardContent className="empty-panel">
            <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
              Failed to load books
            </p>
            <p className="text-xs text-gray-500 sm:text-sm">
              {error instanceof Error
                ? error.message
                : "An unknown error occurred"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-semibold text-light-100 sm:text-3xl">
          Book Collection
        </h1>
        <p className="text-sm text-light-200 sm:text-base">
          Discover and explore our complete library of {pagination.totalBooks}{" "}
          books
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        {/* Filters Sidebar */}
        <div className="w-full shrink-0 sm:w-64">
          <Card className="rounded-lg border border-gray-600 bg-gray-800/30">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center text-base text-light-100 sm:text-lg">
                <Filter className="mr-2 inline size-4" />
                <span>Sort & Filter</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="stack-section">
              {/* Search */}
              <form onSubmit={handleSearch} className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-light-200/60" />
                  <Input
                    placeholder="Search books..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 text-light-100"
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Search className="size-4" />
                  Search
                </Button>
              </form>

              {/* Genre Filter — Radix Select (empty URL param maps to "all") */}
              <FilterSelect
                label="Genre"
                variant="dark"
                value={currentSearchParams.genre || "all"}
                onValueChange={(v) =>
                  handleFilterChange("genre", v === "all" ? "" : v)
                }
                options={genreFilterOptions(genres)}
              />

              <FilterSelect
                label="Availability"
                variant="dark"
                value={currentSearchParams.availability || "all"}
                onValueChange={(v) =>
                  handleFilterChange("availability", v === "all" ? "" : v)
                }
                options={availabilityFilterOptions()}
              />

              <FilterSelect
                label="Minimum Rating"
                variant="dark"
                value={currentSearchParams.rating || "all"}
                onValueChange={(v) =>
                  handleFilterChange("rating", v === "all" ? "" : v)
                }
                options={ratingFilterOptions()}
              />

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  <FilterX className="size-4" />
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Sort and Results Header */}
          <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-xs text-gray-100 sm:text-sm">
                Showing {books.length} of {pagination.totalBooks} books
              </span>
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {currentSearchParams.search && (
                    <Badge variant="secondary" className="text-xs sm:text-sm">
                      Search: &quot;{currentSearchParams.search}&quot;
                    </Badge>
                  )}
                  {currentSearchParams.genre && (
                    <Badge variant="secondary" className="text-xs sm:text-sm">
                      Genre: {currentSearchParams.genre}
                    </Badge>
                  )}
                  {currentSearchParams.availability && (
                    <Badge variant="secondary" className="text-xs sm:text-sm">
                      {currentSearchParams.availability === "available"
                        ? "Available"
                        : "Unavailable"}
                    </Badge>
                  )}
                  {currentSearchParams.rating && (
                    <Badge variant="secondary" className="text-xs sm:text-sm">
                      {currentSearchParams.rating}+ Stars
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex min-w-44 items-center gap-2">
              <FilterSelect
                label="Sort by"
                variant="dark"
                className="flex-1"
                value={currentSearchParams.sort || "title"}
                onValueChange={handleSortChange}
                options={sortFilterOptions()}
              />
            </div>
          </div>

          {/* Books Grid */}
          {books.length === 0 ? (
            <Card className="border-2 border-gray-600 bg-gray-800/30">
              <CardContent className="empty-panel">
                <p className="text-sm text-light-200/70 sm:text-base">
                  No books found matching your criteria.
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="mt-3 sm:mt-4"
                  >
                    <FilterX className="size-4" />
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid-cards grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {books.map((book: Book) => (
                <BookCard key={book.id} {...book} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 sm:mt-8 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="text-xs sm:text-sm"
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>

              <div className="flex gap-1">
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    const pageNum = Math.max(1, pagination.currentPage - 2) + i;
                    if (pageNum > pagination.totalPages) return null;

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          pageNum === pagination.currentPage
                            ? "default"
                            : "outline"
                        }
                        onClick={() => handlePageChange(pageNum)}
                        className="size-8 text-xs sm:size-10 sm:text-sm"
                      >
                        {pageNum}
                      </Button>
                    );
                  },
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="text-xs sm:text-sm"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCollection;
