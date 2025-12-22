"use client";

/**
 * AdminUsersList Component
 *
 * Client component that displays all users and pending admin requests for admin management.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useAllUsers and usePendingAdminRequests hooks with initialData from SSR
 * - Displays skeleton loaders while fetching
 * - Shows error state if fetch fails
 * - Integrates mutations for user role/status updates and admin request approvals
 * - Displays users in a table and admin requests in cards
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import UserSkeleton from "@/components/skeletons/UserSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllUsers, usePendingAdminRequests } from "@/hooks/useQueries";
import {
  useUpdateUserRole,
  useUpdateUserStatus,
  useApproveAdminRequest,
  useRejectAdminRequest,
  useRemoveAdminPrivileges,
} from "@/hooks/useMutations";
import type { User, UsersListResponse } from "@/lib/services/users";
import type { AdminRequest } from "@/lib/services/users";

interface AdminUsersListProps {
  /**
   * Initial users data from SSR (prevents duplicate fetch)
   */
  initialUsers?: User[];
  /**
   * Initial admin requests data from SSR (prevents duplicate fetch)
   */
  initialAdminRequests?: AdminRequest[];
  /**
   * Success message from URL params
   */
  successMessage?: string;
  /**
   * Error message from URL params
   */
  errorMessage?: string;
  /**
   * Current user ID (for preventing self-removal)
   */
  currentUserId?: string;
}

const AdminUsersList: React.FC<AdminUsersListProps> = ({
  initialUsers,
  initialAdminRequests,
  successMessage,
  errorMessage,
  currentUserId,
}) => {
  const { data: session } = useSession();

  // React Query hooks with SSR initial data
  // Transform initialUsers to UsersListResponse format for React Query
  const initialUsersData: UsersListResponse | undefined = initialUsers
    ? {
        users: initialUsers,
        total: initialUsers.length,
        page: 1,
        totalPages: 1,
        limit: initialUsers.length,
      }
    : undefined;

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorData,
  } = useAllUsers(undefined, initialUsersData);

  const {
    data: adminRequestsData,
    isLoading: adminRequestsLoading,
    isError: adminRequestsError,
    error: adminRequestsErrorData,
  } = usePendingAdminRequests(initialAdminRequests);

  // React Query mutations
  const updateUserRoleMutation = useUpdateUserRole();
  const updateUserStatusMutation = useUpdateUserStatus();
  const approveAdminRequestMutation = useApproveAdminRequest();
  const rejectAdminRequestMutation = useRejectAdminRequest();
  const removeAdminPrivilegesMutation = useRemoveAdminPrivileges();

  // CRITICAL: Always prefer React Query data over initial data
  // React Query data is fresh and updates immediately after mutations
  // initial data is only used as fallback during initial load
  // Extract data from responses
  // useAllUsers returns UsersListResponse with users array
  const users: User[] = ((usersData?.users ?? initialUsers) || []) as User[];
  // usePendingAdminRequests returns AdminRequest[] directly
  const adminRequests: AdminRequest[] = ((adminRequestsData ??
    initialAdminRequests) || []) as AdminRequest[];

  // Handler functions for mutations
  const handleUpdateUserRole = async (
    userId: string,
    role: "USER" | "ADMIN"
  ) => {
    const user = users.find((u) => u.id === userId);
    updateUserRoleMutation.mutate({
      userId,
      role,
      userName: user?.fullName,
    });
  };

  const handleUpdateUserStatus = async (
    userId: string,
    status: "PENDING" | "APPROVED" | "REJECTED"
  ) => {
    const user = users.find((u) => u.id === userId);
    updateUserStatusMutation.mutate({
      userId,
      status,
      userName: user?.fullName,
    });
  };

  const handleApproveAdminRequest = async (requestId: string) => {
    const adminId = session?.user?.id;
    if (!adminId) {
      return;
    }
    const request = adminRequests.find((r) => r.id === requestId);
    approveAdminRequestMutation.mutate({
      requestId,
      reviewedBy: adminId,
      userName: request?.userFullName,
    });
  };

  const handleRejectAdminRequest = async (requestId: string) => {
    const adminId = session?.user?.id;
    if (!adminId) {
      return;
    }
    const request = adminRequests.find((r) => r.id === requestId);
    rejectAdminRequestMutation.mutate({
      requestId,
      reviewedBy: adminId,
      rejectionReason: "Rejected by admin",
      userName: request?.userFullName,
    });
  };

  const handleRemoveAdminPrivileges = async (userId: string) => {
    const adminId = session?.user?.id;
    if (!adminId) {
      return;
    }
    const user = users.find((u) => u.id === userId);
    removeAdminPrivilegesMutation.mutate({
      userId,
      removedBy: adminId,
      userName: user?.fullName,
    });
  };

  // Show skeleton while loading (only if no initial data)
  if (
    (usersLoading && (!initialUsers || initialUsers.length === 0)) ||
    (adminRequestsLoading &&
      (!initialAdminRequests || initialAdminRequests.length === 0))
  ) {
    return (
      <section className="w-full rounded-2xl bg-white p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">All Users</h2>
        </div>

        {/* Admin Requests Skeleton */}
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-semibold">Pending Admin Requests</h3>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <UserSkeleton
                key={`admin-request-skeleton-${i}`}
                variant="card"
                className="rounded-lg border border-yellow-200 bg-yellow-50"
              />
            ))}
          </div>
        </div>

        {/* Users Table Skeleton */}
        <div className="mt-7 w-full overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  {[...Array(7)].map((_, i) => (
                    <th
                      key={`header-${i}`}
                      className="border border-gray-200 px-4 py-2 text-left"
                    >
                      <Skeleton className="h-4 w-24" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <UserSkeleton key={`user-skeleton-${i}`} variant="table" />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (
    (usersError && (!initialUsers || initialUsers.length === 0)) ||
    (adminRequestsError &&
      (!initialAdminRequests || initialAdminRequests.length === 0))
  ) {
    return (
      <section className="w-full rounded-2xl bg-white p-7">
        <div className="py-8 text-center">
          <p className="mb-2 text-lg font-semibold text-red-500">
            Failed to load users
          </p>
          <p className="text-sm text-gray-500">
            {usersErrorData instanceof Error
              ? usersErrorData.message
              : adminRequestsErrorData instanceof Error
                ? adminRequestsErrorData.message
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
                {successMessage === "role-updated" &&
                  "✅ Role Updated Successfully!"}
                {successMessage === "user-approved" &&
                  "✅ User Approved Successfully!"}
                {successMessage === "user-rejected" &&
                  "✅ User Rejected Successfully!"}
                {successMessage === "admin-approved" &&
                  "✅ Admin Request Approved Successfully!"}
                {successMessage === "admin-rejected" &&
                  "✅ Admin Request Rejected Successfully!"}
                {successMessage === "admin-removed" &&
                  "✅ Admin Privileges Removed Successfully!"}
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
        <h2 className="text-xl font-semibold">All Users ({users.length})</h2>
      </div>

      {/* Admin Requests Section - Only shows PENDING requests */}
      {adminRequests.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-semibold">
            Pending Admin Requests ({adminRequests.length})
          </h3>
          <div className="space-y-4">
            {adminRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-yellow-200 bg-yellow-50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h4 className="font-medium text-yellow-900">
                        {request.userFullName}
                      </h4>
                      <span className="text-sm text-yellow-700">
                        ({request.userEmail})
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-yellow-800">
                      <strong>Reason:</strong> {request.requestReason}
                    </p>
                    <p className="text-xs text-yellow-600">
                      Requested on:{" "}
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApproveAdminRequest(request.id)}
                      disabled={
                        approveAdminRequestMutation.isPending ||
                        rejectAdminRequestMutation.isPending
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => handleRejectAdminRequest(request.id)}
                      disabled={
                        approveAdminRequestMutation.isPending ||
                        rejectAdminRequestMutation.isPending
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 w-full overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Name
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Email
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  University ID
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Role
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Status
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Joined
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2">
                    {user.fullName}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {user.email}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {user.universityId}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        user.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : user.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    <div className="flex gap-2">
                      {/* Show Remove Admin for existing admins (except current user) */}
                      {user.role === "ADMIN" &&
                        user.id !== (currentUserId || session?.user?.id) && (
                          <Button
                            size="sm"
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={() => handleRemoveAdminPrivileges(user.id)}
                            disabled={removeAdminPrivilegesMutation.isPending}
                          >
                            Remove Admin
                          </Button>
                        )}

                      {/* Show Make Admin for regular users */}
                      {user.role === "USER" && (
                        <Button
                          size="sm"
                          className="bg-purple-600 text-white hover:bg-purple-700"
                          onClick={() => handleUpdateUserRole(user.id, "ADMIN")}
                          disabled={updateUserRoleMutation.isPending}
                        >
                          Make Admin
                        </Button>
                      )}

                      {/* Show Approve/Reject for pending users */}
                      {user.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              handleUpdateUserStatus(user.id, "APPROVED")
                            }
                            disabled={updateUserStatusMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() =>
                              handleUpdateUserStatus(user.id, "REJECTED")
                            }
                            disabled={updateUserStatusMutation.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default AdminUsersList;
