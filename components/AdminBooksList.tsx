"use client";

/**
 * AdminBooksList — catalog grid with universe KPIs, header Create CTA,
 * sky DNA cards (title/author/genre chip/star) + kebab + two-col meta + full-width Publisher.
 * Densify via book.write; View Details → /admin/books/[id].
 * Parent: admin books catalog polish; admin books card DNA
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
import PrefetchLink from "@/components/PrefetchLink";
import BookCover from "@/components/BookCover";
import { useAllBooks, useBookGenres } from "@/hooks/useQueries";
import BookCardSkeleton from "@/components/skeletons/BookCardSkeleton";
import DeleteBookDialog from "@/components/admin/DeleteBookDialog";
import type { BookFilters } from "@/lib/services/books";
import { ADMIN_BOOKS_UNFILTERED } from "@/lib/ui/adminListUniverse";
import {
  isBookActive,
  sumLendableCopies,
} from "@/lib/admin/lendableBookCopies";
import { getBookAvailabilityStatus } from "@/lib/books/bookDetailsViewModel";
import { LIGHT_MENU } from "@/lib/ui/glassActionChrome";
import { OverviewGenreChip } from "@/lib/ui/overviewGenreChip";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import {
  BookPlus,
  Eye,
  Pencil,
  BookMarked,
  Layers,
  BookOpenCheck,
  BookX,
  Star,
  AlertTriangle,
  PackageX,
  Library,
  MoreVertical,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { cn } from "@/lib/utils";

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
  const lastSyncedSearchRef = React.useRef(currentSearch);
  // RQ genres — densify rebuilds unique list on book.write (shared genres stay).
  const { data: genresData } = useBookGenres();
  const genres = genresData ?? [];

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
  // Prefer densified universe (including intentional []) over SSR — last delete
  // must not resurrect rows via initialBooks when books: [] is already cached.
  const universeBooks: Book[] = React.useMemo(() => {
    if (universeData !== undefined) {
      return (universeData.books ?? []) as Book[];
    }
    return (initialBooks ?? []) as Book[];
  }, [universeData, initialBooks]);

  // Filtered table query — warms filtered keys for invalidation / other consumers.
  // Table rows come from universe (+ client filter); do not bind to this result.
  const { isLoading, isError, error } = useAllBooks(filters, initialBooksData);

  // Table/grid: always prefer warm universe for display (filtered = client
  // filter on localSearch + select filters). Instant from first keystroke;
  // URL search stays debounced for shareable links / RQ warming.
  const allBooks: Book[] = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = !hasDisplayFilters
      ? universeBooks
      : universeBooks.filter((b) => {
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
      <AdminPageShell
        header={
          <AdminPageHeader
            title="Book Catalog"
            description="Create, edit, and manage library inventory"
            icon={BookMarked}
            actions={
              <Button className="bg-primary-admin" asChild>
                <Link href="/admin/books/new" className="text-white">
                  <BookPlus className="size-4" />
                  Create a New Book
                </Link>
              </Button>
            }
          />
        }
      >
        <section className="admin-panel">
          <div className="mt-4 w-full overflow-hidden sm:mt-7">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <BookCardSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          </div>
        </section>
      </AdminPageShell>
    );
  }

  // Show error state
  if (isError && allBooks.length === 0) {
    return (
      <AdminPageShell
        header={
          <AdminPageHeader
            title="Book Catalog"
            description="Create, edit, and manage library inventory"
            icon={BookMarked}
            actions={
              <Button className="bg-primary-admin" asChild>
                <Link href="/admin/books/new" className="text-white">
                  <BookPlus className="size-4" />
                  Create a New Book
                </Link>
              </Button>
            }
          />
        }
      >
        <section className="admin-panel">
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
      </AdminPageShell>
    );
  }

  // KPI counts — lendable pool from full-universe catalog (active titles only)
  const { totalCopies, availableCopies, borrowedCopies } =
    sumLendableCopies(universeBooks);
  const activeBookCount = universeBooks.filter((b) => isBookActive(b)).length;
  const featuredCount = universeBooks.filter((b) => b.isFeatured).length;
  const outOfStockCount = universeBooks.filter(
    (b) => b.availableCopies <= 0,
  ).length;
  const lowStockCount = universeBooks.filter((b) => {
    if (!isBookActive(b) || b.availableCopies <= 0) return false;
    return (
      getBookAvailabilityStatus(b.availableCopies, b.totalCopies).tone ===
      "amber"
    );
  }).length;
  const genreCount = new Set(
    universeBooks.map((b) => b.genre.trim()).filter(Boolean),
  ).size;

  return (
    <AdminPageShell
      header={
        <AdminPageHeader
          title="Book Catalog"
          description="Create, edit, and manage library inventory"
          icon={BookMarked}
          actions={
            <Button className="bg-primary-admin" asChild>
              <Link href="/admin/books/new" className="text-white">
                <BookPlus className="size-4" />
                Create a New Book
              </Link>
            </Button>
          }
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
          <StatCard
            title="Featured Titles"
            value={featuredCount}
            icon={Star}
            hue="blue"
          />
          <StatCard
            title="Low Stock"
            value={lowStockCount}
            icon={AlertTriangle}
            hue="amber"
          />
          <StatCard
            title="Out of Stock"
            value={outOfStockCount}
            icon={PackageX}
            hue="rose"
          />
          <StatCard
            title="Genres"
            value={genreCount}
            icon={Library}
            hue="slate"
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
              {allBooks.map((book) => {
                const catalogRating =
                  typeof book.rating === "number" ? book.rating : 0;
                return (
                  <div
                    key={book.id}
                    className="rounded-lg border border-gray-200 p-3 transition-shadow hover:shadow-md sm:p-4"
                  >
                    {/* Header: rectangular cover | sky DNA identity + kebab */}
                    <div className="flex items-start gap-3 sm:gap-4">
                      <BookCover
                        coverColor={book.coverColor}
                        coverImage={book.coverUrl}
                        className="h-16 w-12 shrink-0 sm:h-20 sm:w-16"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 leading-none">
                            <PrefetchLink
                              href={`/admin/books/${book.id}`}
                              className={cn(
                                "line-clamp-2 text-base font-medium sm:text-lg",
                                SKY_LINK_LIGHT,
                              )}
                            >
                              {book.title}
                            </PrefetchLink>
                            <p className="truncate text-sm">
                              <span className="text-gray-500">by </span>
                              <span className="text-gray-700">
                                {book.author?.trim() || "Unknown"}
                              </span>
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <OverviewGenreChip
                                genre={book.genre}
                                className="max-w-40 shrink-0 truncate px-1.5 py-0 text-[10px] sm:text-[10px]"
                              />
                              {catalogRating > 0 ? (
                                <span className="inline-flex shrink-0 items-center gap-0.5 text-xs tabular-nums text-amber-600">
                                  <Star
                                    className="size-3 fill-amber-400 text-amber-400"
                                    aria-hidden
                                  />
                                  {catalogRating}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={LIGHT_MENU.trigger}
                                aria-label={`Actions for ${book.title}`}
                              >
                                <MoreVertical className="size-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className={LIGHT_MENU.content}
                            >
                              <DropdownMenuItem
                                asChild
                                className={LIGHT_MENU.item}
                              >
                                <PrefetchLink href={`/admin/books/${book.id}`}>
                                  <Eye className="size-3.5" />
                                  View Details
                                </PrefetchLink>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                asChild
                                className={LIGHT_MENU.item}
                              >
                                <PrefetchLink
                                  href={`/admin/books/${book.id}/edit`}
                                >
                                  <Pencil className="size-3.5" />
                                  Edit
                                </PrefetchLink>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                asChild
                                className={LIGHT_MENU.item}
                              >
                                <PrefetchLink href={`/books/${book.id}`}>
                                  <ExternalLink className="size-3.5" />
                                  View public page
                                </PrefetchLink>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator
                                className={LIGHT_MENU.separator}
                              />
                              <DeleteBookDialog
                                bookId={book.id}
                                bookTitle={book.title}
                                author={book.author}
                                coverUrl={book.coverUrl}
                                coverColor={book.coverColor}
                                genre={book.genre}
                                rating={book.rating}
                                isActive={book.isActive}
                                totalCopies={book.totalCopies}
                                availableCopies={book.availableCopies}
                                language={book.language}
                                publicationYear={book.publicationYear}
                                isbn={book.isbn}
                                publisher={book.publisher}
                                pageCount={book.pageCount}
                                trigger={
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className={LIGHT_MENU.itemDestructive}
                                  >
                                    <Trash2 className="size-3.5" />
                                    Delete
                                  </DropdownMenuItem>
                                }
                              />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* Two-col meta + full-width Publisher (avoids half-col truncate) */}
                    <div className="mt-3 space-y-1 text-sm">
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-500">Total</dt>
                          <dd className="font-medium tabular-nums text-dark-200">
                            {book.totalCopies}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-500">Available</dt>
                          <dd
                            className={cn(
                              "font-medium tabular-nums",
                              book.availableCopies > 0
                                ? "text-emerald-600"
                                : "text-rose-600",
                            )}
                          >
                            {book.availableCopies}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-500">Status</dt>
                          <dd
                            className={cn(
                              "font-medium",
                              book.isActive
                                ? "text-emerald-600"
                                : "text-rose-600",
                            )}
                          >
                            {book.isActive ? "Active" : "Inactive"}
                          </dd>
                        </div>
                        {book.isFeatured ? (
                          <div className="flex justify-between gap-2">
                            <dt className="text-gray-500">Featured</dt>
                            <dd className="font-medium text-sky-700">
                              Homepage
                            </dd>
                          </div>
                        ) : null}
                        {book.publicationYear != null ? (
                          <div className="flex justify-between gap-2">
                            <dt className="text-gray-500">Year</dt>
                            <dd className="font-medium tabular-nums text-dark-200">
                              {book.publicationYear}
                            </dd>
                          </div>
                        ) : null}
                        {book.pageCount != null ? (
                          <div className="flex justify-between gap-2">
                            <dt className="text-gray-500">Pages</dt>
                            <dd className="font-medium tabular-nums text-dark-200">
                              {book.pageCount}
                            </dd>
                          </div>
                        ) : null}
                        {book.edition?.trim() ? (
                          <div className="flex justify-between gap-2">
                            <dt className="text-gray-500">Edition</dt>
                            <dd className="truncate font-medium text-dark-200">
                              {book.edition}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                      {book.publisher?.trim() ? (
                        <div className="flex min-w-0 items-baseline gap-2">
                          <span className="shrink-0 text-gray-500">
                            Publisher
                          </span>
                          <span className="min-w-0 break-words font-medium text-dark-200">
                            {book.publisher}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </AdminPageShell>
  );
};

export default AdminBooksList;
