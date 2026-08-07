"use client";

/**
 * AdminBookRequestsList Component
 *
 * Client component that displays all borrow requests for admin management.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useBorrowRequests hook with initialData from SSR
 * - Displays skeleton loaders while fetching
 * - Shows error state if fetch fails
 * - Integrates mutations for approving, rejecting, and returning books
 * - Handles success/error messages from URL params
 * - All existing UI, styling, and functionality preserved
 */

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { SearchInput } from "@/components/ui/SearchInput";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import { AdminFilterEmptyState } from "@/components/admin/AdminFilterEmptyState";
import { borrowStatusFilterOptions } from "@/lib/ui/filterOptionStyles";
import BookCover from "@/components/BookCover";
import BorrowSkeleton from "@/components/skeletons/BorrowSkeleton";
import { useBorrowRequests } from "@/hooks/useQueries";
import {
  useApproveBorrow,
  useRejectBorrow,
  useReturnBook,
} from "@/hooks/useMutations";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import { ADMIN_BORROW_REQUESTS_UNFILTERED } from "@/lib/ui/adminListUniverse";
import { BorrowStatusBadge } from "@/lib/ui/semanticBadges";
import {
  CheckCircle,
  XCircle,
  Undo2,
  Loader2,
  Hourglass,
  BookOpen,
  Bookmark,
  RotateCcw,
} from "lucide-react";
import type { BorrowStatus } from "@/lib/services/borrows";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";

interface AdminBookRequestsListProps {
  /**
   * Initial borrow requests data from SSR (prevents duplicate fetch)
   */
  initialRequests?: BorrowRecordWithDetails[];
  /**
   * Success message from URL params
   */
  successMessage?: string;
  /**
   * Error message from URL params
   */
  errorMessage?: string;
}

const AdminBookRequestsList: React.FC<AdminBookRequestsListProps> = ({
  initialRequests,
  successMessage,
  errorMessage,
}) => {
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  // Get current search params from URL
  const currentSearch = searchParamsHook.get("search") || "";
  const currentStatus = searchParamsHook.get("status") || "all";

  const [localSearch, setLocalSearch] = useState(currentSearch);
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

        const newUrl = `/admin/book-requests?${params.toString()}`;
        // Update ref before navigation to prevent sync effect from overwriting
        lastSyncedSearchRef.current = trimmedSearch;
        router.replace(newUrl, { scroll: false });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, searchParamsHook, router]);

  // Build filters from URL params (RQ cache warming; search debounced via URL)
  const filters = React.useMemo(
    () => ({
      status:
        currentStatus !== "all" ? (currentStatus as BorrowStatus) : undefined,
      search: currentSearch || undefined,
    }),
    [currentStatus, currentSearch],
  );

  const searchQuery = localSearch.trim();
  const hasDisplayFilters = Boolean(
    searchQuery || currentStatus !== "all",
  );

  // URL filters (SSR initialData)
  const hasActiveFilters = Boolean(currentSearch || currentStatus !== "all");

  // Only use initialData on first load (when no filters are active)
  const initialRequestsData =
    !hasActiveFilters && initialRequests ? initialRequests : undefined;

  // Full-universe KPIs — dedicated unfiltered query (stays warm under filters)
  const { data: universeRequestsData } = useBorrowRequests(
    ADMIN_BORROW_REQUESTS_UNFILTERED,
    initialRequests,
  );
  const universeRequests: BorrowRecordWithDetails[] = React.useMemo(
    () =>
      (universeRequestsData ?? initialRequests ?? []) as BorrowRecordWithDetails[],
    [universeRequestsData, initialRequests],
  );

  // Filtered query warms cache; table rows come from universe (+ client filter).
  const {
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsErrorData,
  } = useBorrowRequests(filters, initialRequestsData);

  // React Query mutations
  const approveBorrowMutation = useApproveBorrow();
  const rejectBorrowMutation = useRejectBorrow();
  const returnBookMutation = useReturnBook();

  const [actionRecordId, setActionRecordId] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<
    "approve" | "reject" | "return" | null
  >(null);

  // Table: warm universe + client filter on localSearch (instant first keystroke).
  const requests: BorrowRecordWithDetails[] = React.useMemo(() => {
    const base =
      universeRequests.length > 0
        ? universeRequests
        : (initialRequests ?? []);
    if (!hasDisplayFilters) {
      return base;
    }
    const q = searchQuery.toLowerCase();
    return base.filter((r) => {
      if (currentStatus !== "all" && r.status !== currentStatus) return false;
      if (!q) return true;
      return (
        (r.bookTitle ?? "").toLowerCase().includes(q) ||
        (r.bookAuthor ?? "").toLowerCase().includes(q) ||
        (r.userName ?? "").toLowerCase().includes(q) ||
        (r.userEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [
    universeRequests,
    initialRequests,
    hasDisplayFilters,
    searchQuery,
    currentStatus,
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

    router.replace(`/admin/book-requests?${params.toString()}`, {
      scroll: false,
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateSearchParams({ [key]: value });
  };

  const clearFilters = () => {
    setLocalSearch("");
    router.push("/admin/book-requests");
  };

  const clearAction = () => {
    setActionRecordId(null);
    setActionKind(null);
  };

  // Handler functions for mutations
  const handleApproveBorrow = async (recordId: string) => {
    const request = requests.find((r) => r.id === recordId);
    setActionRecordId(recordId);
    setActionKind("approve");
    approveBorrowMutation.mutate(
      {
        recordId,
        bookTitle: request?.bookTitle || undefined,
        userName: request?.userName || undefined,
      },
      { onSettled: clearAction },
    );
  };

  const handleRejectBorrow = async (recordId: string) => {
    const request = requests.find((r) => r.id === recordId);
    setActionRecordId(recordId);
    setActionKind("reject");
    rejectBorrowMutation.mutate(
      {
        recordId,
        bookTitle: request?.bookTitle || undefined,
        userName: request?.userName || undefined,
      },
      { onSettled: clearAction },
    );
  };

  const handleReturnBook = async (recordId: string) => {
    const request = requests.find((r) => r.id === recordId);
    setActionRecordId(recordId);
    setActionKind("return");
    returnBookMutation.mutate(
      {
        recordId,
        bookTitle: request?.bookTitle || undefined,
      },
      { onSettled: clearAction },
    );
  };

  // Skeleton only when nothing displayable
  if (requestsLoading && requests.length === 0) {
    return (
      <section className="admin-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium sm:text-xl">Borrow Queue</h2>
        </div>

        <div className="mt-4 w-full overflow-hidden sm:mt-7">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <BorrowSkeleton key={`borrow-skeleton-${i}`} variant="admin" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (requestsError && requests.length === 0) {
    return (
      <section className="admin-panel">
        <div className="py-6 text-center sm:py-8">
          <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
            Failed to load borrow requests
          </p>
          <p className="text-xs text-gray-500 sm:text-sm">
            {requestsErrorData instanceof Error
              ? requestsErrorData.message
              : "An unknown error occurred"}
          </p>
        </div>
      </section>
    );
  }

  // KPI counts — full-universe queue (not filtered table rows)
  const pendingCount = universeRequests.filter(
    (r) => r.status === "PENDING",
  ).length;
  const borrowedCount = universeRequests.filter(
    (r) => r.status === "BORROWED",
  ).length;
  const returnedCount = universeRequests.filter(
    (r) => r.status === "RETURNED",
  ).length;
  const cancelledCount = universeRequests.filter(
    (r) => r.status === "CANCELLED",
  ).length;

  return (
    <>
      <AdminPageHeader
        title="Borrow Queue"
        description="Approve, reject, and return borrow requests"
        icon={Bookmark}
      />
      <section className="admin-panel">
        {/* KPI Statistics Cards */}
        <StatCardGrid className="mb-4 sm:mb-6">
          <StatCard
            title="Total Requests"
            value={universeRequests.length}
            icon={BookOpen}
            hue="blue"
          />
          <StatCard
            title="Pending"
            value={pendingCount}
            icon={Hourglass}
            hue="amber"
          />
          <StatCard
            title="Borrowed"
            value={borrowedCount}
            icon={CheckCircle}
            hue="violet"
          />
          <StatCard
            title="Returned"
            value={returnedCount}
            icon={RotateCcw}
            hue="emerald"
          />
          <StatCard
            title="Cancelled"
            value={cancelledCount}
            icon={XCircle}
            hue="rose"
          />
        </StatCardGrid>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
            <div className="flex items-center">
              <div className="shrink-0">
                <svg
                  className="size-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule={"evenodd" as const}
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule={"evenodd" as const}
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  {successMessage === "approved" &&
                    "✅ Borrow Request Approved Successfully!"}
                  {successMessage === "rejected" &&
                    "✅ Borrow Request Rejected Successfully!"}
                  {successMessage === "returned" &&
                    "✅ Book Returned Successfully!"}
                </h3>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
            <div className="flex items-center">
              <div className="shrink-0">
                <svg
                  className="size-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule={"evenodd" as const}
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule={"evenodd" as const}
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  ❌ Operation Failed
                </h3>
              </div>
            </div>
          </div>
        )}

        <AdminListToolbar
          title="Borrow Queue"
          count={requests.length}
          chips={
            <DismissibleFilterChips
              variant="light"
              groups={
                currentStatus !== "all"
                  ? [
                      {
                        label: "Status",
                        values: [currentStatus],
                        onClear: () => handleFilterChange("status", "all"),
                        renderBadge: (value: string) => {
                          const opt = borrowStatusFilterOptions().find(
                            (o) => o.value === value,
                          );
                          return (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                              {opt?.label ?? value}
                            </span>
                          );
                        },
                      },
                    ]
                  : []
              }
              onReset={clearFilters}
            />
          }
        >
          {/* Instant debounced search — URL push already debounced; debounceMs=0 */}
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search book, author, user…"
            debounceMs={0}
            className="sm:min-w-64"
          />
          <FilterSelect
            label="Status"
            variant="light"
            labelLayout="embedded"
            className="shrink-0 sm:min-w-[150px]"
            value={currentStatus || "all"}
            onValueChange={(v) => handleFilterChange("status", v)}
            options={borrowStatusFilterOptions()}
          />
        </AdminListToolbar>

        <div className="mt-4 w-full overflow-hidden sm:mt-7">
          <div className="space-y-2 sm:space-y-4">
            {requests.length === 0 ? (
              <AdminFilterEmptyState
                entityLabel="borrow requests"
                filtered={hasDisplayFilters}
                onClear={clearFilters}
                blankMessage="No borrow requests found."
              />
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50 sm:p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                    {/* Book Cover */}
                    <div className="shrink-0">
                      <BookCover
                        coverColor={request.bookCoverColor || ""}
                        coverImage={request.bookCoverUrl || ""}
                        className="h-16 w-12 sm:h-20 sm:w-16"
                      />
                    </div>

                    {/* Request Details */}
                    <div className="flex-1">
                      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                        <div>
                          <Link
                            prefetch={false}
                            href={`/admin/books/${request.bookId}/edit`}
                            className="text-base font-medium text-blue-700 hover:text-blue-600 sm:text-lg"
                          >
                            {request.bookTitle}
                          </Link>
                          <p className="text-gray-600">
                            by {request.bookAuthor}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.bookGenre}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-medium">Borrower Details</h4>
                          <Link
                            prefetch={false}
                            href={`/admin/users/${request.userId}`}
                            className="text-sm text-blue-700 hover:text-blue-600"
                          >
                            {request.userName}
                          </Link>
                          <p className="text-sm text-gray-600">
                            {request.userEmail}
                          </p>
                          <p className="text-sm text-gray-500">
                            ID: {request.userUniversityId}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:mt-4 sm:gap-4 sm:text-sm md:grid-cols-3">
                        <div>
                          <span className="font-medium">
                            {request.status === "PENDING"
                              ? "Request Created At:"
                              : "Borrow Date:"}
                          </span>
                          <p>
                            {request.borrowDate
                              ? new Date(
                                  request.borrowDate,
                                ).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Due Date:</span>
                          <p>
                            {request.dueDate
                              ? new Date(request.dueDate).toLocaleDateString()
                              : request.status === "PENDING"
                                ? "N/A (7 days from approval)"
                                : "Not set"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">Status:</span>
                          <BorrowStatusBadge status={request.status} />
                        </div>
                      </div>
                    </div>

                    {/* Actions — per-row spinner while this record's mutation runs */}
                    <div className="w-full shrink-0 sm:w-auto">
                      {request.status === "PENDING" && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveBorrow(request.id)}
                            disabled={
                              actionRecordId != null &&
                              actionRecordId !== request.id
                                ? true
                                : actionRecordId === request.id
                            }
                          >
                            {actionRecordId === request.id &&
                            actionKind === "approve" ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <CheckCircle className="size-4" />
                            )}
                            {actionRecordId === request.id &&
                            actionKind === "approve"
                              ? "Approving…"
                              : "Approve"}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleRejectBorrow(request.id)}
                            disabled={
                              actionRecordId != null &&
                              actionRecordId !== request.id
                                ? true
                                : actionRecordId === request.id
                            }
                          >
                            {actionRecordId === request.id &&
                            actionKind === "reject" ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <XCircle className="size-4" />
                            )}
                            {actionRecordId === request.id &&
                            actionKind === "reject"
                              ? "Rejecting…"
                              : "Reject"}
                          </Button>
                        </div>
                      )}
                      {request.status === "BORROWED" && (
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleReturnBook(request.id)}
                          disabled={
                            actionRecordId != null &&
                            actionRecordId !== request.id
                              ? true
                              : actionRecordId === request.id
                          }
                        >
                          {actionRecordId === request.id &&
                          actionKind === "return" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Undo2 className="size-4" />
                          )}
                          {actionRecordId === request.id &&
                          actionKind === "return"
                            ? "Returning…"
                            : "Mark as Returned"}
                        </Button>
                      )}
                      {request.status === "RETURNED" && (
                        <div className="text-sm text-gray-500">
                          Returned on:{" "}
                          {request.returnDate
                            ? new Date(request.returnDate).toLocaleDateString()
                            : "N/A"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminBookRequestsList;
