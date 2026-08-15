"use client";

/**
 * BookCollection Component
 *
 * Client catalog for /all-books: full-width filter toolbar + meta row (chips / sort),
 * optimistic displayFilters + URL sync, React Query + SSR initialData.
 *
 * Behavior:
 * - displayFilters drive chrome + useAllBooks (admin-parity instant clear/select)
 * - URL updated via router.replace for shareability; back/forward syncs display
 * - Instant search: controlled input + 300ms debounce → display + URL
 * - Prefetch unfiltered page-1 so Clear/Reset hits warm cache
 * - Toolbar: Search | Genre | Availability | Rating; Sort + chips on meta row
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BookCard from "@/components/BookCard";
import BookCardSkeleton from "@/components/skeletons/BookCardSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filter-select";
import {
  genreFilterOptions,
  genreFilterIcon,
  availabilityFilterOptions,
  ratingFilterOptions,
  sortFilterOptions,
} from "@/lib/ui/filterOptionStyles";
import {
  FILTER_CLEAR_GLASS_BTN_CLASS,
  filterChipDismissXBtnClass,
  filterChipGlassPillClass,
} from "@/lib/ui/filter-chip-styles";
import { useAllBooks, useBookGenres } from "@/hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  getBooksList,
  type BooksListResponse,
  type BookFilters,
} from "@/lib/services/books";
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
import { cn } from "@/lib/utils";

type CollectionSearchParams = {
  search: string;
  genre: string;
  availability: string;
  rating: string;
  sort: string;
  page: number;
};

function parseCollectionParams(searchParamsKey: string): CollectionSearchParams {
  const params = new URLSearchParams(searchParamsKey);
  return {
    search: params.get("search") || "",
    genre: params.get("genre") || "",
    availability: params.get("availability") || "",
    rating: params.get("rating") || "",
    sort: params.get("sort") || "title",
    page: parseInt(params.get("page") || "1", 10) || 1,
  };
}

function collectionParamsEqual(
  a: CollectionSearchParams,
  b: CollectionSearchParams,
): boolean {
  return (
    a.search === b.search &&
    a.genre === b.genre &&
    a.availability === b.availability &&
    a.rating === b.rating &&
    a.sort === b.sort &&
    a.page === b.page
  );
}

function toCatalogQueryString(filters: CollectionSearchParams): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.availability) params.set("availability", filters.availability);
  if (filters.rating) params.set("rating", filters.rating);
  if (filters.sort && filters.sort !== "title") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

function toBookFilters(
  filters: CollectionSearchParams,
  limit: number,
): BookFilters {
  return {
    search: filters.search || undefined,
    genre: filters.genre || undefined,
    availability:
      (filters.availability as BookFilters["availability"]) || undefined,
    rating: filters.rating ? Number(filters.rating) : undefined,
    sort: (filters.sort as BookFilters["sort"]) || undefined,
    page: filters.page,
    limit,
  };
}

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
  useEffect(() => {
    if (initialUserBorrows && initialUserBorrows.length > 0) {
      const userId = initialUserBorrows[0].userId;
      if (userId) {
        const queryKey = queryKeys.borrows.user(userId);
        queryClient.setQueryData(queryKey, initialUserBorrows);
      }
    }
  }, [initialUserBorrows, queryClient]);

  const searchParamsKey = searchParamsHook.toString();
  const urlParams: CollectionSearchParams = useMemo(
    () => parseCollectionParams(searchParamsKey),
    [searchParamsKey],
  );

  /** Optimistic chrome + query filters; URL follows for shareability. */
  const [displayFilters, setDisplayFilters] =
    useState<CollectionSearchParams>(urlParams);
  /** QS we last pushed — skip overwriting display until URL catches up. */
  const pendingUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (pendingUrlRef.current !== null) {
      if (searchParamsKey === pendingUrlRef.current) {
        pendingUrlRef.current = null;
      }
      return;
    }
    setDisplayFilters((prev) =>
      collectionParamsEqual(prev, urlParams) ? prev : urlParams,
    );
  }, [searchParamsKey, urlParams]);

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

  const filtersMatchSsr = collectionParamsEqual(
    displayFilters,
    {
      search: ssrSearchParams.search || "",
      genre: ssrSearchParams.genre || "",
      availability: ssrSearchParams.availability || "",
      rating: ssrSearchParams.rating || "",
      sort: ssrSearchParams.sort || "title",
      page: ssrSearchParams.page || 1,
    },
  );

  const booksPerPage =
    initialPagination?.booksPerPage || legacyPagination?.booksPerPage || 12;

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

  const bookQueryFilters = useMemo(
    () => toBookFilters(displayFilters, booksPerPage),
    [displayFilters, booksPerPage],
  );

  const {
    data: booksData,
    isLoading,
    isError,
    error,
  } = useAllBooks(bookQueryFilters, initialData, {
    skipEmptyPlaceholder: true,
  });

  // Prefetch default (unfiltered) catalog so Clear/Reset paints from warm cache
  useEffect(() => {
    const warm: BookFilters = {
      sort: (displayFilters.sort as BookFilters["sort"]) || "title",
      page: 1,
      limit: booksPerPage,
    };
    void queryClient.prefetchQuery({
      queryKey: queryKeys.books.adminList(warm),
      queryFn: () => getBooksList(warm),
      staleTime: 30 * 1000,
    });
  }, [queryClient, booksPerPage, displayFilters.sort]);

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

  const books =
    (booksData?.books ??
      (filtersMatchSsr ? (legacyBooks ?? initialBooks) : undefined)) ||
    [];
  // RQ genres (SSR seed) — densify drops orphan genres only after book.delete.
  const { data: genresFromQuery } = useBookGenres(
    legacyGenres ?? initialGenres,
  );
  const genres = genresFromQuery ?? legacyGenres ?? initialGenres ?? [];

  const pagination = booksData
    ? {
        currentPage: booksData.page ?? displayFilters.page,
        totalPages: booksData.totalPages ?? 1,
        totalBooks: booksData.total ?? 0,
        booksPerPage: booksData.limit ?? booksPerPage,
      }
    : (legacyPagination ??
      initialPagination ?? {
        currentPage: displayFilters.page,
        totalPages: 1,
        totalBooks: books.length,
        booksPerPage,
      });

  const [localSearch, setLocalSearch] = useState(displayFilters.search);
  const lastSyncedSearchRef = useRef(displayFilters.search);

  const applyFilters = useCallback(
    (next: CollectionSearchParams) => {
      const qs = toCatalogQueryString(next);
      pendingUrlRef.current = qs;
      setDisplayFilters(next);
      router.replace(qs ? `/all-books?${qs}` : "/all-books", { scroll: false });
    },
    [router],
  );

  // Sync localSearch when display search changes externally (back/forward / clear)
  useEffect(() => {
    if (
      displayFilters.search !== lastSyncedSearchRef.current &&
      localSearch === lastSyncedSearchRef.current
    ) {
      setLocalSearch(displayFilters.search);
      lastSyncedSearchRef.current = displayFilters.search;
    }
  }, [displayFilters.search, localSearch]);

  // Debounced instant search → display + URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmedSearch = localSearch.trim();
      if (trimmedSearch === displayFilters.search) return;
      lastSyncedSearchRef.current = trimmedSearch;
      applyFilters({
        ...displayFilters,
        search: trimmedSearch,
        page: 1,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, displayFilters, applyFilters]);

  const handleFilterChange = (key: string, value: string) => {
    applyFilters({
      ...displayFilters,
      [key]: value,
      page: 1,
    });
  };

  const handleSortChange = (sort: string) => {
    applyFilters({
      ...displayFilters,
      sort,
      page: 1,
    });
  };

  const handlePageChange = (page: number) => {
    applyFilters({
      ...displayFilters,
      page,
    });
  };

  /** Clear search/genre/availability/rating; keep sort (and drop page). */
  const clearFilters = () => {
    setLocalSearch("");
    lastSyncedSearchRef.current = "";
    applyFilters({
      search: "",
      genre: "",
      availability: "",
      rating: "",
      sort: displayFilters.sort || "title",
      page: 1,
    });
  };

  /** Remove a single active filter chip without wiping sort. */
  const removeFilter = (
    key: "search" | "genre" | "availability" | "rating",
  ) => {
    if (key === "search") {
      setLocalSearch("");
      lastSyncedSearchRef.current = "";
    }
    applyFilters({
      ...displayFilters,
      [key]: "",
      page: 1,
    });
  };

  const hasActiveFilters = Boolean(
    displayFilters.search ||
      displayFilters.genre ||
      displayFilters.availability ||
      displayFilters.rating,
  );

  // First paint with no cached rows — pulse toolbar + card skeletons (no “Loading…” copy)
  if (isLoading && books.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl font-medium text-light-100 sm:text-3xl">
            Book Collection
          </h1>
          <p className="text-sm text-light-200 sm:text-base">
            Discover and explore our complete library of {libraryTotalBooks}{" "}
            books
          </p>
        </div>
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

  if (isError) {
    return (
      <div className="w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl font-medium text-light-100 sm:text-3xl">
            Book Collection
          </h1>
        </div>
        <Card>
          <CardContent className="empty-panel">
            <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
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
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-medium text-light-100 sm:text-3xl">
          Book Collection
        </h1>
        <p className="text-sm text-light-200 sm:text-base">
          Discover and explore our complete library of {libraryTotalBooks} books
        </p>
      </div>

      <Card className="mb-4 rounded-lg border border-gray-600 bg-gray-800/30 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
            <div className="w-full min-w-0 flex-1 space-y-1.5">
              <label
                htmlFor="all-books-search"
                className="block text-sm font-medium text-light-100"
              >
                Search
              </label>
              <div className="relative">
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
              value={displayFilters.genre || "all"}
              onValueChange={(v) =>
                handleFilterChange("genre", v === "all" ? "" : v)
              }
              options={genreFilterOptions(genres, "All Genres", "dark")}
            />

            <FilterSelect
              label="Availability"
              variant="dark"
              className="w-full min-w-0 flex-1"
              value={displayFilters.availability || "all"}
              onValueChange={(v) =>
                handleFilterChange("availability", v === "all" ? "" : v)
              }
              options={availabilityFilterOptions("All Books", "dark")}
            />

            <FilterSelect
              label="Rating"
              variant="dark"
              className="w-full min-w-0 flex-1"
              value={displayFilters.rating || "all"}
              onValueChange={(v) =>
                handleFilterChange("rating", v === "all" ? "" : v)
              }
              options={ratingFilterOptions("dark")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Meta: Showing + chips + inline Reset All | Sort by */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="shrink-0 text-xs tabular-nums text-gray-100 sm:text-sm">
            Showing {books.length} of {pagination.totalBooks} books
          </span>

          {hasActiveFilters && (
            <>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {displayFilters.search ? (
                  <span className={filterChipGlassPillClass("muted")}>
                    <Search
                      className="size-3.5 shrink-0 text-sky-300"
                      aria-hidden
                    />
                    <span className="leading-none">
                      &quot;{displayFilters.search}&quot;
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFilter("search")}
                      className={filterChipDismissXBtnClass("dark")}
                      aria-label="Remove search filter"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ) : null}

                {displayFilters.genre ? (
                  <span className={filterChipGlassPillClass("genre")}>
                    {React.createElement(
                      genreFilterIcon(displayFilters.genre),
                      {
                        className: "size-3.5 shrink-0 text-emerald-300",
                        "aria-hidden": true,
                      },
                    )}
                    <span className="leading-none">{displayFilters.genre}</span>
                    <button
                      type="button"
                      onClick={() => removeFilter("genre")}
                      className={filterChipDismissXBtnClass("dark")}
                      aria-label={`Remove genre filter ${displayFilters.genre}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ) : null}

                {displayFilters.availability ? (
                  <span
                    className={filterChipGlassPillClass(
                      displayFilters.availability === "available"
                        ? "genre"
                        : "warn",
                    )}
                  >
                    {displayFilters.availability === "available" ? (
                      <CircleCheck
                        className="size-3.5 shrink-0 text-emerald-300"
                        aria-hidden
                      />
                    ) : (
                      <CircleX
                        className="size-3.5 shrink-0 text-rose-300"
                        aria-hidden
                      />
                    )}
                    <span className="leading-none">
                      {displayFilters.availability === "available"
                        ? "Available"
                        : "Unavailable"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFilter("availability")}
                      className={filterChipDismissXBtnClass("dark")}
                      aria-label="Remove availability filter"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ) : null}

                {displayFilters.rating ? (
                  <span className={filterChipGlassPillClass("rating")}>
                    <Star
                      className="size-3.5 shrink-0 text-amber-300"
                      aria-hidden
                    />
                    <span className="leading-none">
                      {displayFilters.rating}+ Stars
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFilter("rating")}
                      className={filterChipDismissXBtnClass("dark")}
                      aria-label="Remove rating filter"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ) : null}
              </div>

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
          value={displayFilters.sort || "title"}
          onValueChange={handleSortChange}
          options={sortFilterOptions("dark")}
        />
      </div>

      {books.length === 0 ? (
        <Card className="border-2 border-gray-600 bg-gray-800/30">
          <CardContent className="empty-panel">
            <p className="text-sm text-light-200/70 sm:text-base">
              No books found matching your criteria.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className={cn(FILTER_CLEAR_GLASS_BTN_CLASS, "mt-3 sm:mt-4")}
              >
                <FilterX className="size-4" aria-hidden />
                Clear Filters
              </button>
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
