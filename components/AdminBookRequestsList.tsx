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

import React from "react";
import { Button } from "@/components/ui/button";
import BookCover from "@/components/BookCover";
import BorrowSkeleton from "@/components/skeletons/BorrowSkeleton";
import { useBorrowRequests } from "@/hooks/useQueries";
import {
  useApproveBorrow,
  useRejectBorrow,
  useReturnBook,
} from "@/hooks/useMutations";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";

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
  // React Query hook with SSR initial data
  const {
    data: requestsData,
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsErrorData,
  } = useBorrowRequests(undefined, initialRequests);

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
    initialRequests) || []) as BorrowRecordWithDetails[];

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
      <section className="w-full rounded-2xl bg-white p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Borrow Requests</h2>
        </div>

        <div className="mt-7 w-full overflow-hidden">
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
      <section className="w-full rounded-2xl bg-white p-7">
        <div className="py-8 text-center">
          <p className="mb-2 text-lg font-semibold text-red-500">
            Failed to load borrow requests
          </p>
          <p className="text-sm text-gray-500">
            {requestsErrorData instanceof Error
              ? requestsErrorData.message
              : "An unknown error occurred"}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full rounded-2xl bg-white p-7">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
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
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">
          Borrow Requests ({requests.length})
        </h2>
      </div>

      <div className="mt-7 w-full overflow-hidden">
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No borrow requests found.
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
              >
                <div className="flex items-start gap-4">
                  {/* Book Cover */}
                  <div className="shrink-0">
                    <BookCover
                      coverColor={request.bookCoverColor || ""}
                      coverImage={request.bookCoverUrl || ""}
                      className="h-20 w-16"
                    />
                  </div>

                  {/* Request Details */}
                  <div className="flex-1">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="text-lg font-semibold">
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

                    <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
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
                  <div className="shrink-0">
                    {request.status === "PENDING" && (
                      <div className="flex gap-2">
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
