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
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BookCover from "@/components/BookCover";
import BorrowSkeleton from "@/components/skeletons/BorrowSkeleton";
import { useBorrowRequests } from "@/hooks/useQueries";
import {
  useApproveBorrow,
  useRejectBorrow,
  useReturnBook,
} from "@/hooks/useMutations";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import type { BorrowStatus } from "@/lib/services/borrows";

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
  const queryClient = useQueryClient();

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
        queryClient.invalidateQueries({ queryKey: ["borrow-requests"] });
        router.replace(newUrl, { scroll: false });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, searchParamsHook, queryClient, router]);

  // Build filters from URL params
  const filters = React.useMemo(
    () => ({
      status:
        currentStatus !== "all" ? (currentStatus as BorrowStatus) : undefined,
      search: currentSearch || undefined,
    }),
    [currentStatus, currentSearch]
  );

  // Check if any filters are active
  const hasActiveFilters = currentSearch || currentStatus !== "all";

  // Only use initialData on first load (when no filters are active)
  const initialRequestsData =
    !hasActiveFilters && initialRequests ? initialRequests : undefined;

  // React Query hook with SSR initial data
  const {
    data: requestsData,
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsErrorData,
  } = useBorrowRequests(filters, initialRequestsData);

  // React Query mutations
  const approveBorrowMutation = useApproveBorrow();
  const rejectBorrowMutation = useRejectBorrow();
  const returnBookMutation = useReturnBook();

  // CRITICAL: Always prefer React Query data over initial data
  // React Query data is fresh and updates immediately after mutations
  // initial data is only used as fallback during initial load
  // Extract data from response
  // useBorrowRequests returns BorrowRecordWithDetails[] directly
  const requests: BorrowRecordWithDetails[] = ((requestsData ??
    initialRequests) ||
    []) as BorrowRecordWithDetails[];

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

    queryClient.invalidateQueries({ queryKey: ["borrow-requests"] });
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

  // Handler functions for mutations
  const handleApproveBorrow = async (recordId: string) => {
    const request = requests.find((r) => r.id === recordId);
    approveBorrowMutation.mutate({
      recordId,
      bookTitle: request?.bookTitle || undefined,
      userName: request?.userName || undefined,
    });
  };

  const handleRejectBorrow = async (recordId: string) => {
    const request = requests.find((r) => r.id === recordId);
    rejectBorrowMutation.mutate({
      recordId,
      bookTitle: request?.bookTitle || undefined,
      userName: request?.userName || undefined,
    });
  };

  const handleReturnBook = async (recordId: string) => {
    const request = requests.find((r) => r.id === recordId);
    returnBookMutation.mutate({
      recordId,
      bookTitle: request?.bookTitle || undefined,
    });
  };

  // Show skeleton while loading (only if no initial data)
  if (requestsLoading && (!initialRequests || initialRequests.length === 0)) {
    return (
      <section className="w-full rounded-2xl bg-white p-4 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold sm:text-xl">Borrow Requests</h2>
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
  if (requestsError && (!initialRequests || initialRequests.length === 0)) {
    return (
      <section className="w-full rounded-2xl bg-white p-4 sm:p-7">
        <div className="py-6 text-center sm:py-8">
          <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
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

  return (
    <section className="w-full rounded-2xl bg-white p-4 sm:p-7">
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

      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h2 className="text-lg font-semibold text-dark-400 sm:text-xl">
          Borrow Requests ({requests.length})
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
              placeholder="Search by book, author, user..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-dark-400 placeholder:text-gray-500 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </form>
          {/* Filter Dropdown */}
          <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <span className="text-sm text-dark-400">Status:</span>
            <select
              value={currentStatus}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-dark-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 sm:min-w-[170px]"
            >
              <option value="all">All</option>
              <option value="PENDING">Pending</option>
              <option value="BORROWED">Borrowed</option>
              <option value="RETURNED">Returned</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 w-full overflow-hidden sm:mt-7">
        <div className="space-y-3 sm:space-y-4">
          {requests.length === 0 ? (
            <div className="py-6 text-center sm:py-8">
              <p className="mb-4 text-base font-medium text-gray-600 sm:text-lg">
                {hasActiveFilters
                  ? "No borrow requests found matching your criteria."
                  : "No borrow requests found."}
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
                        <h3 className="text-base font-semibold sm:text-lg">
                          {request.bookTitle}
                        </h3>
                        <p className="text-gray-600">by {request.bookAuthor}</p>
                        <p className="text-sm text-gray-500">
                          {request.bookGenre}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium">Borrower Details</h4>
                        <p className="text-sm">{request.userName}</p>
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
                            ? new Date(request.borrowDate).toLocaleDateString()
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
                      <div>
                        <span className="font-medium">Status:</span>
                        <span
                          className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${
                            request.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : request.status === "BORROWED"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full shrink-0 sm:w-auto">
                    {request.status === "PENDING" && (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveBorrow(request.id)}
                          disabled={
                            approveBorrowMutation.isPending ||
                            rejectBorrowMutation.isPending
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleRejectBorrow(request.id)}
                          disabled={
                            approveBorrowMutation.isPending ||
                            rejectBorrowMutation.isPending
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {request.status === "BORROWED" && (
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleReturnBook(request.id)}
                        disabled={returnBookMutation.isPending}
                      >
                        Mark as Returned
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
  );
};

export default AdminBookRequestsList;
