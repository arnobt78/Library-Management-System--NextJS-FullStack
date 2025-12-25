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

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type {
  User,
  UsersListResponse,
  UserFilters,
} from "@/lib/services/users";
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
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const queryClient = useQueryClient();

  // Get current search params from URL (default sort to "created" for most recent first)
  const currentSearch = searchParamsHook.get("search") || "";
  const currentStatus = searchParamsHook.get("status") || "all";
  const currentRole = searchParamsHook.get("role") || "all";
  const currentSort = searchParamsHook.get("sort") || "created";

  const [localSearch, setLocalSearch] = useState(currentSearch);
  const lastSyncedSearchRef = React.useRef(currentSearch);

  // Debounce search input for instant filtering
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== currentSearch) {
        console.log("[AdminUsersList] Search changed:", localSearch);
        const params = new URLSearchParams(searchParamsHook.toString());
        const trimmedSearch = localSearch.trim();

        if (trimmedSearch) {
          params.set("search", trimmedSearch);
        } else {
          params.delete("search");
        }

        if (!params.get("sort")) {
          params.set("sort", "created");
        }

        const newUrl = `/admin/users?${params.toString()}`;
        console.log("[AdminUsersList] Instant search navigating to:", newUrl);

        // Update ref before navigation to prevent sync effect from overwriting
        lastSyncedSearchRef.current = trimmedSearch;
        queryClient.invalidateQueries({ queryKey: ["all-users"] });
        router.replace(newUrl, { scroll: false });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, searchParamsHook, queryClient, router]);

  // Build filters from URL params (default sort to "created" for most recent first)
  // Use useMemo to ensure filters object updates when URL params change
  const filters: UserFilters = React.useMemo(() => {
    const filterObj = {
      search: currentSearch || undefined,
      status:
        currentStatus !== "all"
          ? (currentStatus as UserFilters["status"])
          : undefined,
      role:
        currentRole !== "all"
          ? (currentRole as UserFilters["role"])
          : undefined,
      sort: (currentSort as UserFilters["sort"]) || "created",
    };
    console.log("[AdminUsersList] Filters updated:", filterObj);
    return filterObj;
  }, [currentSearch, currentStatus, currentRole, currentSort]);

  // Check if any filters are active (used for conditional initialData and empty state)
  const hasActiveFilters =
    currentSearch || currentStatus !== "all" || currentRole !== "all";

  // Only use initialData on first load (when no filters are active)
  // This prevents initialData from overriding filtered results
  const initialUsersData: UsersListResponse | undefined =
    !hasActiveFilters && initialUsers
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
  } = useAllUsers(filters, initialUsersData);

  // Debug: Log users data
  React.useEffect(() => {
    console.log("[AdminUsersList] Users data:", {
      usersCount: usersData?.users?.length || 0,
      total: usersData?.total || 0,
      filters,
      isLoading: usersLoading,
    });
  }, [usersData, filters, usersLoading]);

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

  // Update search params in URL and trigger refetch
  const updateSearchParams = (newParams: Record<string, string>) => {
    console.log("[AdminUsersList] updateSearchParams called with:", newParams);
    const params = new URLSearchParams(searchParamsHook.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Always include sort if not present
    if (!params.get("sort")) {
      params.set("sort", "created");
    }

    const newUrl = `/admin/users?${params.toString()}`;
    console.log("[AdminUsersList] Navigating to:", newUrl);

    // Invalidate queries to force refetch with new params
    queryClient.invalidateQueries({ queryKey: ["all-users"] });
    console.log("[AdminUsersList] Queries invalidated");

    // Use replace to avoid adding to history and ensure immediate update
    router.replace(newUrl, { scroll: false });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSearch = localSearch.trim();
    console.log("[AdminUsersList] Form submitted with search:", trimmedSearch);
    updateSearchParams({ search: trimmedSearch });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateSearchParams({ [key]: value });
  };

  const clearFilters = () => {
    setLocalSearch("");
    router.push("/admin/users?sort=created");
  };

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

  // Ensure sort param is set on initial load (most recent first)
  React.useEffect(() => {
    if (!searchParamsHook.get("sort")) {
      const params = new URLSearchParams(searchParamsHook.toString());
      params.set("sort", "created");
      router.replace(`/admin/users?${params.toString()}`, { scroll: false });
    }
  }, [searchParamsHook, router]);

  // CRITICAL: Always prefer React Query data over initial data
  // React Query data is fresh and updates immediately after mutations
  // initial data is only used as fallback during initial load
  // Extract data from responses
  // useAllUsers returns UsersListResponse with users array
  const users: User[] = ((usersData?.users ?? initialUsers) || []) as User[];
  // usePendingAdminRequests returns AdminRequest[] directly
  const adminRequests: AdminRequest[] = ((adminRequestsData ??
    initialAdminRequests) ||
    []) as AdminRequest[];

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
      <section className="w-full rounded-2xl bg-white p-4 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold sm:text-xl">All Users</h2>
        </div>

        {/* Admin Requests Skeleton */}
        <div className="mt-4 sm:mt-6">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">Pending Admin Requests</h3>
          <div className="space-y-3 sm:space-y-4">
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
        <div className="mt-4 w-full overflow-hidden sm:mt-7">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  {[...Array(7)].map((_, i) => (
                    <th
                      key={`header-${i}`}
                      className="border border-gray-200 px-2 py-1.5 text-left text-xs sm:px-4 sm:py-2 sm:text-sm"
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
      <section className="w-full rounded-2xl bg-white p-4 sm:p-7">
        <div className="py-6 text-center sm:py-8">
          <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
            Failed to load users
          </p>
          <p className="text-xs text-gray-500 sm:text-sm">
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
          All Users ({users.length})
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="flex-1 sm:min-w-[250px]">
            <Input
              type="text"
              placeholder="Search users..."
              value={localSearch}
              onChange={(e) => {
                const newValue = e.target.value;
                console.log("[AdminUsersList] Input changed:", newValue);
                setLocalSearch(newValue);
              }}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-dark-400 placeholder:text-gray-500 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </form>
          {/* Filter Dropdowns */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm text-dark-400">Status:</span>
              <select
                value={currentStatus}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-dark-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 sm:min-w-[170px]"
              >
                <option value="all">All</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm text-dark-400">Role:</span>
              <select
                value={currentRole}
                onChange={(e) => handleFilterChange("role", e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-dark-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 sm:min-w-[170px]"
              >
                <option value="all">All</option>
                <option value="USER">Users</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Requests Section - Only shows PENDING requests */}
      {adminRequests.length > 0 && (
        <div className="mt-4 sm:mt-6">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">
            Pending Admin Requests ({adminRequests.length})
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {adminRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <h4 className="text-sm font-medium text-yellow-900 sm:text-base">
                        {request.userFullName}
                      </h4>
                      <span className="text-xs text-yellow-700 sm:text-sm">
                        ({request.userEmail})
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-yellow-800 sm:text-sm">
                      <strong>Reason:</strong> {request.requestReason}
                    </p>
                    <p className="text-xs text-yellow-600">
                      Requested on:{" "}
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:ml-4 sm:flex-row">
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

      <div className="mt-4 w-full overflow-hidden sm:mt-7">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-2 py-1.5 text-left text-xs sm:px-4 sm:py-2 sm:text-sm">
                  Name
                </th>
                <th className="border border-gray-200 px-2 py-1.5 text-left text-xs sm:px-4 sm:py-2 sm:text-sm">
                  Email
                </th>
                <th className="border border-gray-200 px-2 py-1.5 text-left text-xs sm:px-4 sm:py-2 sm:text-sm">
                  University ID
                </th>
                <th className="border border-gray-200 px-2 py-1.5 text-left text-xs sm:px-4 sm:py-2 sm:text-sm">
                  Role
                </th>
                <th className="border border-gray-200 px-2 py-1.5 text-left text-xs sm:px-4 sm:py-2 sm:text-sm">
                  Status
                </th>
                <th className="border border-gray-200 px-2 py-1.5 text-left text-xs sm:px-4 sm:py-2 sm:text-sm">
                  Joined
                </th>
                <th className="border border-gray-200 px-2 py-1.5 text-left text-xs sm:px-4 sm:py-2 sm:text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-200 px-2 py-6 sm:px-4 sm:py-8">
                    <div className="flex flex-col items-center justify-center text-center">
                      <p className="mb-4 text-base font-medium text-gray-600 sm:text-lg">
                        No users found matching your criteria.
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
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-2 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
                      {user.fullName}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
                      {user.email}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
                      {user.universityId}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 sm:px-4 sm:py-2">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:py-1 sm:text-xs ${
                          user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 sm:px-4 sm:py-2">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:py-1 sm:text-xs ${
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
                    <td className="border border-gray-200 px-2 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 sm:px-4 sm:py-2">
                      <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                        {/* Show Remove Admin for existing admins (except current user) */}
                        {user.role === "ADMIN" &&
                          user.id !== (currentUserId || session?.user?.id) && (
                            <Button
                              size="sm"
                              className="bg-red-600 text-white hover:bg-red-700"
                              onClick={() =>
                                handleRemoveAdminPrivileges(user.id)
                              }
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
                            onClick={() =>
                              handleUpdateUserRole(user.id, "ADMIN")
                            }
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default AdminUsersList;
