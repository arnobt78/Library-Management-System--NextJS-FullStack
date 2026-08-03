"use client";

/**
 * BookCollection Component
 *
 * Client catalog for /all-books: full-width filter toolbar + meta row (chips / sort),
 * URL-driven filters, React Query + SSR initialData.
 *
 * Behavior:
 * - Instant search: controlled input + 300ms debounce → router.replace (no Search button)
 * - Instant dropdowns/sort: onValueChange → router.replace({ scroll: false })
 * - Live useSearchParams drive useAllBooks so filter changes refetch without remount
 * - initialData only when URL still matches SSR params (avoids stale grid after filter)
 * - Toolbar: Search | Genre | Availability | Rating (equal flex); Sort + chips on meta row
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BookCard from "@/components/BookCard";
import BookCardSkeleton from "@/components/skeletons/BookCardSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filter-select";
import {
  genreFilterOptions,
  genreFilterIcon,
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
  X,
  CircleCheck,
  CircleX,
  Star,
} from "lucide-react";

type CollectionSearchParams = {
  search: string;
  genre: string;
  availability: string;
  rating: string;
  sort: string;
  page: number;
};

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
  initialSearchParams?: CollectionSearchParams;
  /**
   * Unfiltered catalog size from SSR — subtitle “complete library of N books”
   * (independent of active search/filters; “Showing X of Y” uses filtered total)
   */
  initialLibraryTotalBooks?: number;
  /**
   * Initial user borrows from SSR (populates React Query cache for faster navigation to book detail pages)
   */
  initialUserBorrows?: BorrowRecord[];
  /**
   * Legacy props for backward compatibility (deprecated, use initial* props instead)
   */
  books?: Book[];
  genres?: string[];
  searchParams?: CollectionSearchParams;
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
  initialLibraryTotalBooks,
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

  // Live URL is source of truth so instant filter/search updates the grid without remount
  const searchParamsKey = searchParamsHook.toString();
  const currentSearchParams: CollectionSearchParams = useMemo(() => {
    const params = new URLSearchParams(searchParamsKey);
    return {
      search: params.get("search") || "",
      genre: params.get("genre") || "",
      availability: params.get("availability") || "",
      rating: params.get("rating") || "",
      sort: params.get("sort") || "title",
      page: parseInt(params.get("page") || "1", 10) || 1,
    };
  }, [searchParamsKey]);

  const ssrSearchParams: CollectionSearchParams = useMemo(
    () =>
      initialSearchParams ||
      legacySearchParams || {
        search: "",
        genre: "",
        availability: "",
        rating: "",
        sort: "title",
        page: 1,
      },
    [initialSearchParams, legacySearchParams],
  );

  // Only hydrate RQ with SSR list when URL still matches the SSR filter snapshot
  const filtersMatchSsr =
    currentSearchParams.search === (ssrSearchParams.search || "") &&
    currentSearchParams.genre === (ssrSearchParams.genre || "") &&
    currentSearchParams.availability === (ssrSearchParams.availability || "") &&
    currentSearchParams.rating === (ssrSearchParams.rating || "") &&
    (currentSearchParams.sort || "title") ===
      (ssrSearchParams.sort || "title") &&
    currentSearchParams.page === (ssrSearchParams.page || 1);

  const initialData: BooksListResponse | undefined =
    filtersMatchSsr && (initialBooks || legacyBooks)
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

  const booksPerPage =
    initialPagination?.booksPerPage || legacyPagination?.booksPerPage || 12;

  const {
    data: booksData,
    isLoading,
    isError,
    error,
  } = useAllBooks(
    {
      search: currentSearchParams.search || undefined,
      genre: currentSearchParams.genre || undefined,
      availability:
        (currentSearchParams.availability as
          "available" | "unavailable" | "all") || undefined,
      rating: currentSearchParams.rating
        ? Number(currentSearchParams.rating)
        : undefined,
      sort:
        (currentSearchParams.sort as "title" | "author" | "rating" | "date") ||
        undefined,
      page: currentSearchParams.page,
      limit: booksPerPage,
    },
    initialData,
  );

  // Unfiltered catalog size for subtitle; invalidates with books domain mutations
  const libraryTotalInitial: BooksListResponse | undefined =
    typeof initialLibraryTotalBooks === "number"
      ? {
          books: [],
          total: initialLibraryTotalBooks,
          page: 1,
          totalPages: 1,
          limit: 1,
        }
      : undefined;
  const { data: libraryMeta } = useAllBooks(
    { page: 1, limit: 1 },
    libraryTotalInitial,
  );
  const libraryTotalBooks = libraryMeta?.total ?? initialLibraryTotalBooks ?? 0;

  // CRITICAL: Always prefer React Query data over initial/legacy data
  // React Query data is fresh and updates immediately after mutations / filter changes
  const books =
    (booksData?.books ??
      (filtersMatchSsr ? (legacyBooks ?? initialBooks) : undefined)) ||
    [];
  const genres = (legacyGenres ?? initialGenres) || [];

  const pagination = booksData
    ? {
        currentPage: booksData.page ?? currentSearchParams.page,
        totalPages: booksData.totalPages ?? 1,
        totalBooks: booksData.total ?? 0,
        booksPerPage: booksData.limit ?? booksPerPage,
      }
    : (legacyPagination ??
      initialPagination ?? {
        currentPage: currentSearchParams.page,
        totalPages: 1,
        totalBooks: books.length,
        booksPerPage,
      });

  const [localSearch, setLocalSearch] = useState(currentSearchParams.search);
  const lastSyncedSearchRef = useRef(currentSearchParams.search);

  // Sync localSearch with URL when it changes externally (back/forward), not mid-typing
  useEffect(() => {
    if (
      currentSearchParams.search !== lastSyncedSearchRef.current &&
      localSearch === lastSyncedSearchRef.current
    ) {
      setLocalSearch(currentSearchParams.search);
      lastSyncedSearchRef.current = currentSearchParams.search;
    }
  }, [currentSearchParams.search, localSearch]);

  // Debounced instant search → URL (mirrors AdminBooksList 300ms pattern)
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmedSearch = localSearch.trim();
      if (trimmedSearch !== currentSearchParams.search) {
        const params = new URLSearchParams(searchParamsHook.toString());

        if (trimmedSearch) {
          params.set("search", trimmedSearch);
        } else {
          params.delete("search");
        }
        // Reset page when search text changes
        params.delete("page");

        lastSyncedSearchRef.current = trimmedSearch;
        const qs = params.toString();
        router.replace(qs ? `/all-books?${qs}` : "/all-books", {
          scroll: false,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, currentSearchParams.search, searchParamsHook, router]);

  const updateSearchParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParamsHook.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Reset to page 1 when filters/sort change (not when only page changes)
    if (Object.keys(newParams).some((key) => key !== "page")) {
      params.delete("page");
    }

    const qs = params.toString();
    router.replace(qs ? `/all-books?${qs}` : "/all-books", { scroll: false });
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

  /** Clear search/genre/availability/rating; keep sort (and drop page). */
  const clearFilters = () => {
    setLocalSearch("");
    lastSyncedSearchRef.current = "";
    const params = new URLSearchParams(searchParamsHook.toString());
    params.delete("search");
    params.delete("genre");
    params.delete("availability");
    params.delete("rating");
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `/all-books?${qs}` : "/all-books", { scroll: false });
  };

  /** Remove a single active filter chip (URL param) without wiping sort. */
  const removeFilter = (
    key: "search" | "genre" | "availability" | "rating",
  ) => {
    if (key === "search") {
      setLocalSearch("");
      lastSyncedSearchRef.current = "";
    }
    updateSearchParams({ [key]: "" });
  };

  const hasActiveFilters = Boolean(
    currentSearchParams.search ||
    currentSearchParams.genre ||
    currentSearchParams.availability ||
    currentSearchParams.rating,
  );

  // First paint with no cached rows — pulse toolbar + card skeletons (no “Loading…” copy)
  if (isLoading && books.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl font-semibold text-light-100 sm:text-3xl">
            Book Collection
          </h1>
          <p className="text-sm text-light-200 sm:text-base">
            Discover and explore our complete library of {libraryTotalBooks}{" "}
            books
          </p>
        </div>
        {/* Inline pulse placeholders — same rhythm as loaded toolbar + grid */}
        <div
          className="mb-4 h-28 animate-pulse rounded-lg border border-gray-600 bg-gray-800/30 sm:mb-6 sm:h-24"
          aria-hidden
        />
        <div
          className="mb-4 h-9 animate-pulse rounded-md bg-gray-800/40 sm:mb-6 sm:max-w-xs"
          aria-hidden
        />
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
      {/* Page title */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-semibold text-light-100 sm:text-3xl">
          Book Collection
        </h1>
        <p className="text-sm text-light-200 sm:text-base">
          Discover and explore our complete library of {libraryTotalBooks} books
        </p>
      </div>

      {/* Filter toolbar — Search + Genre + Availability + Rating (equal flex, h-9 aligned) */}
      <Card className="mb-4 rounded-lg border border-gray-600 bg-gray-800/30 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
            {/* Instant search — no submit; debounced URL update; space-y matches FilterSelect */}
            <div className="w-full min-w-0 flex-1 space-y-1.5">
              <label
                htmlFor="all-books-search"
                className="block text-sm font-medium text-light-100"
              >
                Search
              </label>
              <div className="relative">
                {/* Icon/placeholder match dark FilterSelect muted chrome */}
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-light-200/70" />
                <Input
                  id="all-books-search"
                  type="search"
                  placeholder="Type to search books"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="catalog-search-input h-9 w-full border-gray-700 bg-dark-300 pl-9 pr-3 text-light-100 placeholder:text-light-100 focus-visible:ring-primary"
                  autoComplete="off"
                />
              </div>
            </div>

            <FilterSelect
              label="Genre"
              variant="dark"
              className="w-full min-w-0 flex-1"
              value={currentSearchParams.genre || "all"}
              onValueChange={(v) =>
                handleFilterChange("genre", v === "all" ? "" : v)
              }
              options={genreFilterOptions(genres, "All Genres", "dark")}
            />

            <FilterSelect
              label="Availability"
              variant="dark"
              className="w-full min-w-0 flex-1"
              value={currentSearchParams.availability || "all"}
              onValueChange={(v) =>
                handleFilterChange("availability", v === "all" ? "" : v)
              }
              options={availabilityFilterOptions("All Books", "dark")}
            />

            <FilterSelect
              label="Rating"
              variant="dark"
              className="w-full min-w-0 flex-1"
              value={currentSearchParams.rating || "all"}
              onValueChange={(v) =>
                handleFilterChange("rating", v === "all" ? "" : v)
              }
              options={ratingFilterOptions("dark")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Meta: Showing + chips + Reset All | Sort by (inline from sm); same mb as toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="shrink-0 text-xs text-gray-100 sm:text-sm">
            Showing {books.length} of {pagination.totalBooks} books
          </span>

          {hasActiveFilters && (
            <>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {currentSearchParams.search ? (
                  <Badge
                    variant="secondary"
                    className="inline-flex items-center gap-1.5 py-1 pl-2 pr-1 text-xs sm:text-sm"
                  >
                    <Search className="size-3.5 shrink-0" aria-hidden />
                    <span className="leading-none">
                      &quot;{currentSearchParams.search}&quot;
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFilter("search")}
                      className="inline-flex size-5 items-center justify-center rounded-full hover:bg-black/10"
                      aria-label="Remove search filter"
                    >
                      <X className="size-3.5" />
                    </button>
                  </Badge>
                ) : null}

                {currentSearchParams.genre ? (
                  <Badge
                    variant="secondary"
                    className="inline-flex items-center gap-1.5 py-1 pl-2 pr-1 text-xs sm:text-sm"
                  >
                    {React.createElement(
                      genreFilterIcon(currentSearchParams.genre),
                      {
                        className: "size-3.5 shrink-0 text-emerald-600",
                        "aria-hidden": true,
                      },
                    )}
                    <span className="leading-none">
                      {currentSearchParams.genre}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFilter("genre")}
                      className="inline-flex size-5 items-center justify-center rounded-full hover:bg-black/10"
                      aria-label={`Remove genre filter ${currentSearchParams.genre}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </Badge>
                ) : null}

                {currentSearchParams.availability ? (
                  <Badge
                    variant="secondary"
                    className="inline-flex items-center gap-1.5 py-1 pl-2 pr-1 text-xs sm:text-sm"
                  >
                    {currentSearchParams.availability === "available" ? (
                      <CircleCheck
                        className="size-3.5 shrink-0 text-emerald-600"
                        aria-hidden
                      />
                    ) : (
                      <CircleX
                        className="size-3.5 shrink-0 text-rose-600"
                        aria-hidden
                      />
                    )}
                    <span className="leading-none">
                      {currentSearchParams.availability === "available"
                        ? "Available"
                        : "Unavailable"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFilter("availability")}
                      className="inline-flex size-5 items-center justify-center rounded-full hover:bg-black/10"
                      aria-label="Remove availability filter"
                    >
                      <X className="size-3.5" />
                    </button>
                  </Badge>
                ) : null}

                {currentSearchParams.rating ? (
                  <Badge
                    variant="secondary"
                    className="inline-flex items-center gap-1.5 py-1 pl-2 pr-1 text-xs sm:text-sm"
                  >
                    {/* Outline amber star (not filled) — matches rating list accent style */}
                    <Star
                      className="size-3.5 shrink-0 text-amber-500"
                      aria-hidden
                    />
                    <span className="leading-none">
                      {currentSearchParams.rating}+ Stars
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFilter("rating")}
                      className="inline-flex size-5 items-center justify-center rounded-full hover:bg-black/10"
                      aria-label="Remove rating filter"
                    >
                      <X className="size-3.5" />
                    </button>
                  </Badge>
                ) : null}
              </div>

              {/* Text + icon — not a badge/button chrome */}
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-light-200 underline-offset-2 hover:text-light-100 hover:underline sm:text-sm"
              >
                <FilterX className="size-3.5 shrink-0" aria-hidden />
                Reset All
              </button>
            </>
          )}
        </div>

        <FilterSelect
          label="Sort by"
          variant="dark"
          labelLayout="inline"
          className="w-full shrink-0 sm:w-auto sm:min-w-56"
          value={currentSearchParams.sort || "title"}
          onValueChange={handleSortChange}
          options={sortFilterOptions("dark")}
        />
      </div>

      {/* Books Grid — full page-shell width */}
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
            className="text-xs hover:bg-light-100 sm:text-sm"
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
                      pageNum === pagination.currentPage ? "default" : "outline"
                    }
                    onClick={() => handlePageChange(pageNum)}
                    className="size-8 text-xs hover:bg-light-100 sm:size-10 sm:text-sm"
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
            className="text-xs hover:bg-light-100 sm:text-sm"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookCollection;
