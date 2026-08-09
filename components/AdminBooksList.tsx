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
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/filter-select";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import { AdminFilterEmptyState } from "@/components/admin/AdminFilterEmptyState";
import {
  genreFilterOptions,
  availabilityFilterOptions,
} from "@/lib/ui/filterOptionStyles";
import Link from "next/link";
import BookCover from "@/components/BookCover";
import { useAllBooks } from "@/hooks/useQueries";
import { getBookGenres } from "@/lib/services/books";
import BookCardSkeleton from "@/components/skeletons/BookCardSkeleton";
import DeleteBookDialog from "@/components/admin/DeleteBookDialog";
import type { BookFilters } from "@/lib/services/books";
import { ADMIN_BOOKS_UNFILTERED } from "@/lib/ui/adminListUniverse";
import {
  isBookActive,
  sumLendableCopies,
} from "@/lib/admin/lendableBookCopies";
import {
  Plus,
  Eye,
  Pencil,
  BookMarked,
  Layers,
  BookOpenCheck,
  BookX,
} from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";

interface AdminBooksListProps {
  /**
   * Initial books data from SSR (prevents duplicate fetch)
   */
  initialBooks?: Book[];
}

const AdminBooksList: React.FC<AdminBooksListProps> = ({ initialBooks }) => {
  const router = useRouter();
  const searchParamsHook = useSearchParams();

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
        router.replace(newUrl, { scroll: false });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, searchParamsHook, router]);

  // URL filters drive RQ cache keys (debounced). Display search uses localSearch
  // so the list filters on the first keystroke (all-books-style instant UX).
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
    [currentSearch, currentGenre, currentAvailability],
  );

  const searchQuery = localSearch.trim();
  const hasDisplayFilters = Boolean(
    searchQuery || currentGenre !== "all" || currentAvailability !== "all",
  );

  // Check if any URL filters are active (SSR initialData / empty chips)
  const hasActiveFilters = Boolean(
    currentSearch || currentGenre !== "all" || currentAvailability !== "all",
  );

  const ssrBooksResponse = React.useMemo(
    () =>
      initialBooks
        ? {
            books: initialBooks,
            total: initialBooks.length,
            page: 1,
            totalPages: 1,
            limit: initialBooks.length,
          }
        : undefined,
    [initialBooks],
  );

  // Only use initialData on first load (when no filters are active)
  const initialBooksData = !hasActiveFilters ? ssrBooksResponse : undefined;

  // Full-universe KPIs — dedicated unfiltered query (stays warm under filters)
  const { data: universeData } = useAllBooks(
    ADMIN_BOOKS_UNFILTERED,
    ssrBooksResponse,
  );
  const universeBooks: Book[] = React.useMemo(
    () => (universeData?.books ?? initialBooks ?? []) as Book[],
    [universeData, initialBooks],
  );

  // Filtered table query — warms filtered keys for invalidation / other consumers.
  // Table rows come from universe (+ client filter); do not bind to this result.
  const {
    isLoading,
    isError,
    error,
  } = useAllBooks(filters, initialBooksData);

  // Table/grid: always prefer warm universe for display (filtered = client
  // filter on localSearch + select filters). Instant from first keystroke;
  // URL search stays debounced for shareable links / RQ warming.
  const allBooks: Book[] = React.useMemo(() => {
    const base =
      universeBooks.length > 0 ? universeBooks : (initialBooks ?? []);
    const q = searchQuery.toLowerCase();
    const filtered = !hasDisplayFilters
      ? base
      : base.filter((b) => {
          if (currentGenre !== "all" && b.genre !== currentGenre) return false;
          if (currentAvailability === "available" && b.availableCopies <= 0) {
            return false;
          }
          if (currentAvailability === "unavailable" && b.availableCopies > 0) {
            return false;
          }
          if (!q) return true;
          return (
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q)
          );
        });
    // Stable A-Z — densify must not reshuffle the grid.
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [
    universeBooks,
    initialBooks,
    hasDisplayFilters,
    searchQuery,
    currentGenre,
    currentAvailability,
  ]);

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

    router.replace(`/admin/books?${params.toString()}`, { scroll: false });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateSearchParams({ [key]: value });
  };

  const clearFilters = () => {
    setLocalSearch("");
    router.push("/admin/books");
  };

  // Skeleton only when nothing displayable (placeholder/SSR already covered)
  if (isLoading && allBooks.length === 0) {
    return (
      <section className="admin-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium sm:text-xl">Book Catalog</h2>
          <Button className="bg-primary-admin" asChild>
            <Link href="/admin/books/new" className="text-white">
              <Plus className="size-4" />
              Create a New Book
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
  if (isError && allBooks.length === 0) {
    return (
      <section className="admin-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium sm:text-xl">Book Catalog</h2>
          <Button className="bg-primary-admin" asChild>
            <Link href="/admin/books/new" className="text-white">
              <Plus className="size-4" />
              Create a New Book
            </Link>
          </Button>
        </div>

        <div className="mt-4 w-full overflow-hidden sm:mt-7">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
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

  // KPI counts — lendable pool from full-universe catalog (active titles only)
  const {
    totalCopies,
    availableCopies,
    borrowedCopies,
  } = sumLendableCopies(universeBooks);
  const activeBookCount = universeBooks.filter((b) => isBookActive(b)).length;

  return (
    <AdminPageShell
      header={
        <AdminPageHeader
          title="Book Catalog"
          description="Create, edit, and manage library inventory"
          icon={BookMarked}
        />
      }
      kpis={
        <StatCardGrid>
          <StatCard
            title="Total Books"
            value={universeBooks.length}
            icon={BookMarked}
            hue="blue"
          />
          <StatCard
            title="Total Copies"
            value={totalCopies}
            icon={Layers}
            hue="slate"
          />
          <StatCard
            title="Available Copies"
            value={availableCopies}
            icon={BookOpenCheck}
            hue="emerald"
          />
          <StatCard
            title="Borrowed Copies"
            value={borrowedCopies}
            icon={BookX}
            hue="amber"
          />
          <StatCard
            title="Active Titles"
            value={activeBookCount}
            icon={BookMarked}
            hue="violet"
            badges={[
              {
                label: `${universeBooks.length - activeBookCount} inactive`,
                hue: "rose",
              },
            ]}
          />
        </StatCardGrid>
      }
    >
      <section className="admin-panel">
        <AdminListToolbar
          title="Book Catalog"
          count={allBooks.length}
          chips={
            <DismissibleFilterChips
              variant="light"
              groups={[
                ...(currentGenre !== "all"
                  ? [
                      {
                        label: "Genre",
                        values: [currentGenre],
                        onClear: () => handleFilterChange("genre", "all"),
                        renderBadge: (value: string) => (
                          <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                            {value}
                          </span>
                        ),
                      },
                    ]
                  : []),
                ...(currentAvailability !== "all"
                  ? [
                      {
                        label: "Availability",
                        values: [currentAvailability],
                        onClear: () =>
                          handleFilterChange("availability", "all"),
                        renderBadge: (value: string) => (
                          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                            {value === "available"
                              ? "Available"
                              : value === "unavailable"
                                ? "Unavailable"
                                : value}
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
              onReset={clearFilters}
            />
          }
        >
          {/* Instant debounced search — URL push is already debounced; debounceMs=0 */}
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search books…"
            debounceMs={0}
            className="sm:min-w-64"
          />
          <FilterSelect
            label="Genre"
            variant="light"
            labelLayout="embedded"
            className="shrink-0 sm:min-w-[150px]"
            value={currentGenre || "all"}
            onValueChange={(v) => handleFilterChange("genre", v)}
            options={genreFilterOptions(genres, "All Genres")}
          />
          <FilterSelect
            label="Availability"
            variant="light"
            labelLayout="embedded"
            className="shrink-0 sm:min-w-[150px]"
            value={currentAvailability || "all"}
            onValueChange={(v) => handleFilterChange("availability", v)}
            options={availabilityFilterOptions("All Availability")}
          />
        </AdminListToolbar>

        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <Button className="bg-primary-admin" asChild>
            <Link href="/admin/books/new" className="text-white">
              <Plus className="size-4" />
              Create a New Book
            </Link>
          </Button>
        </div>

        <div className="mt-4 w-full overflow-hidden sm:mt-7">
          {allBooks.length === 0 ? (
            <AdminFilterEmptyState
              entityLabel="books"
              filtered={hasDisplayFilters}
              onClear={clearFilters}
              blankMessage="No books found. Create your first book!"
            />
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
                      <Link
                        prefetch={false}
                        href={`/books/${book.id}`}
                        className="line-clamp-2 text-base font-medium text-blue-700 hover:text-blue-600 sm:text-lg"
                      >
                        {book.title}
                      </Link>
                      <p className="text-sm text-gray-600">by {book.author}</p>
                      <p className="mt-1 text-xs text-gray-500">{book.genre}</p>

                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Total Copies:</span>
                          <span className="font-medium">
                            {book.totalCopies}
                          </span>
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

                        {book.isFeatured ? (
                          <div className="flex justify-between text-sm">
                            <span>Featured:</span>
                            <span className="font-medium text-blue-600">
                              Homepage
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap">
                        <Button size="sm" asChild>
                          <Link
                            href={`/books/${book.id}`}
                            prefetch={false}
                            className="inline-flex items-center gap-2 text-white"
                          >
                            <Eye className="size-4" />
                            View Details
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link
                            href={`/admin/books/${book.id}/edit`}
                            className="inline-flex items-center gap-2"
                          >
                            <Pencil className="size-4" />
                            Edit Book
                          </Link>
                        </Button>
                        <DeleteBookDialog
                          bookId={book.id}
                          bookTitle={book.title}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AdminPageShell>
  );
};

export default AdminBooksList;
