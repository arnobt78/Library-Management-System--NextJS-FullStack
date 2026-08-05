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
 * - Displays users in a table, pending admin requests, and recent decisions
 *   (who approved/rejected — reviewer join via admin-request.write invalidation)
 */

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import PersonAttribution from "@/components/PersonAttribution";
import DateMetaLine from "@/components/DateMetaLine";
import AdminRequestDeclineDialog from "@/components/admin/AdminRequestDeclineDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/ui/filter-select";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import {
  userStatusFilterOptions,
  userRoleFilterOptions,
} from "@/lib/ui/filterOptionStyles";
import { useSession } from "next-auth/react";
import UserSkeleton from "@/components/skeletons/UserSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAllUsers,
  usePendingAdminRequests,
  useRecentAdminRequestDecisions,
} from "@/hooks/useQueries";
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
import { ADMIN_REQUEST_WITHDRAWN_REASON } from "@/lib/admin/adminRequestConstants";
import {
  Search,
  FilterX,
  Shield,
  ShieldOff,
  CheckCircle,
  XCircle,
  Lock,
  Loader2,
  CalendarPlus,
  CalendarCheck,
  Users as UsersIcon,
  UserCheck,
  Hourglass,
  UserCog,
} from "lucide-react";
import { isProtectedDemoAccount } from "@/constants";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/SortableHeader";

const DECISION_REASON_MAX = 120;

function truncateDecisionText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= DECISION_REASON_MAX) return trimmed;
  return `${trimmed.slice(0, DECISION_REASON_MAX - 1)}…`;
}

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
   * Recent APPROVED/REJECTED decisions from SSR (reviewer attribution)
   */
  initialRecentDecisions?: AdminRequest[];
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
  initialRecentDecisions,
  successMessage,
  errorMessage,
  currentUserId,
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  // Get current search params from URL (default sort to "created" for most recent first)
  const currentSearch = searchParamsHook.get("search") || "";
  const currentStatus = searchParamsHook.get("status") || "all";
  const currentRole = searchParamsHook.get("role") || "all";
  const currentSort = searchParamsHook.get("sort") || "created";

  const [localSearch, setLocalSearch] = useState(currentSearch);
  const lastSyncedSearchRef = React.useRef(currentSearch);
  /** Pending request selected for Approve confirm / Decline dialog */
  const [decisionTarget, setDecisionTarget] = useState<AdminRequest | null>(
    null,
  );
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  /** Table Make Admin / Remove Admin confirm target */
  const [roleTarget, setRoleTarget] = useState<{
    id: string;
    fullName: string;
    email: string;
    action: "make" | "remove";
  } | null>(null);

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

        if (!params.get("sort")) {
          params.set("sort", "created");
        }

        const newUrl = `/admin/users?${params.toString()}`;
        // Update ref before navigation to prevent sync effect from overwriting
        lastSyncedSearchRef.current = trimmedSearch;
        router.replace(newUrl, { scroll: false });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, searchParamsHook, router]);

  // Build filters from URL params (default sort to "created" for most recent first)
  // Use useMemo to ensure filters object updates when URL params change
  const filters: UserFilters = React.useMemo(() => {
    return {
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

  const {
    data: adminRequestsData,
    isLoading: adminRequestsLoading,
    isError: adminRequestsError,
    error: adminRequestsErrorData,
  } = usePendingAdminRequests(initialAdminRequests);

  const { data: recentDecisionsData } = useRecentAdminRequestDecisions(
    initialRecentDecisions,
  );

  // React Query mutations
  const updateUserRoleMutation = useUpdateUserRole();
  const updateUserStatusMutation = useUpdateUserStatus();
  const approveAdminRequestMutation = useApproveAdminRequest();
  const rejectAdminRequestMutation = useRejectAdminRequest();
  const removeAdminPrivilegesMutation = useRemoveAdminPrivileges();

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

    // Always include sort if not present
    if (!params.get("sort")) {
      params.set("sort", "created");
    }

    const newUrl = `/admin/users?${params.toString()}`;
    // Use replace to avoid adding to history and ensure immediate update
    router.replace(newUrl, { scroll: false });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSearch = localSearch.trim();
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
  const recentDecisions: AdminRequest[] = ((recentDecisionsData ??
    initialRecentDecisions) ||
    []) as AdminRequest[];

  // Handler functions for mutations — role changes go through confirm dialogs
  const openMakeAdminConfirm = (user: User) => {
    setRoleTarget({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      action: "make",
    });
  };

  const openRemoveAdminConfirm = (user: User) => {
    setRoleTarget({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      action: "remove",
    });
  };

  const handleConfirmRoleChange = () => {
    if (!roleTarget) return;
    if (roleTarget.action === "make") {
      updateUserRoleMutation.mutate(
        {
          userId: roleTarget.id,
          role: "ADMIN",
          userName: roleTarget.fullName,
        },
        {
          onSuccess: () => setRoleTarget(null),
        },
      );
      return;
    }
    removeAdminPrivilegesMutation.mutate(
      {
        userId: roleTarget.id,
        userName: roleTarget.fullName,
      },
      {
        onSuccess: () => setRoleTarget(null),
      },
    );
  };

  const handleUpdateUserStatus = async (
    userId: string,
    status: "PENDING" | "APPROVED" | "REJECTED",
  ) => {
    const user = users.find((u) => u.id === userId);
    updateUserStatusMutation.mutate({
      userId,
      status,
      userName: user?.fullName,
    });
  };

  const openApproveConfirm = (request: AdminRequest) => {
    setDecisionTarget(request);
    setApproveOpen(true);
  };

  const openDeclineDialog = (request: AdminRequest) => {
    setDecisionTarget(request);
    setDeclineOpen(true);
  };

  const handleConfirmApprove = () => {
    if (!decisionTarget) return;
    approveAdminRequestMutation.mutate(
      {
        requestId: decisionTarget.id,
        userName: decisionTarget.userFullName,
      },
      {
        onSuccess: () => {
          setApproveOpen(false);
          setDecisionTarget(null);
        },
      },
    );
  };

  const handleConfirmDecline = (rejectionReason: string) => {
    if (!decisionTarget) return;
    rejectAdminRequestMutation.mutate(
      {
        requestId: decisionTarget.id,
        rejectionReason,
        userName: decisionTarget.userFullName,
      },
      {
        onSuccess: () => {
          setDeclineOpen(false);
          setDecisionTarget(null);
        },
      },
    );
  };

  // Show skeleton while loading (only if no initial data)
  if (
    (usersLoading && (!initialUsers || initialUsers.length === 0)) ||
    (adminRequestsLoading &&
      (!initialAdminRequests || initialAdminRequests.length === 0))
  ) {
    return (
      <section className="admin-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold sm:text-xl">All Users</h2>
        </div>

        {/* Admin Requests Skeleton */}
        <div className="mt-4 sm:mt-6">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">
            Pending Admin Requests
          </h3>
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
      <section className="admin-panel">
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

  // KPI counts for the top-of-page StatCard row (Wave 4 rollout)
  const approvedUserCount = users.filter((u) => u.status === "APPROVED").length;
  const pendingUserCount = users.filter((u) => u.status === "PENDING").length;
  const rejectedUserCount = users.filter((u) => u.status === "REJECTED").length;
  const adminUserCount = users.filter((u) => u.role === "ADMIN").length;

  // Table column defs — same cell content/handlers as the previous plain <table>,
  // now with asc/desc sorting + pagination via the shared DataTable (Wave 5 retrofit).
  const userColumns: ColumnDef<User>[] = [
    {
      accessorKey: "fullName",
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => (
        <Link
          prefetch={false}
          href={`/admin/users/${row.original.id}`}
          className="font-medium text-blue-700 hover:underline"
        >
          {row.original.fullName}
        </Link>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
      cell: ({ row }) => row.original.email,
    },
    {
      accessorKey: "universityId",
      header: ({ column }) => <SortableHeader column={column}>University ID</SortableHeader>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:py-1 sm:text-xs ${
            row.original.role === "ADMIN"
              ? "bg-purple-100 text-purple-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {row.original.role}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:py-1 sm:text-xs ${
            row.original.status === "APPROVED"
              ? "bg-green-100 text-green-800"
              : row.original.status === "PENDING"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableHeader column={column}>Joined</SortableHeader>,
      cell: ({ row }) =>
        row.original.createdAt
          ? new Date(row.original.createdAt).toLocaleDateString()
          : "N/A",
      sortingFn: (a, b) =>
        (a.original.createdAt ? new Date(a.original.createdAt).getTime() : 0) -
        (b.original.createdAt ? new Date(b.original.createdAt).getTime() : 0),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
            {isProtectedDemoAccount(user) ? (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 sm:text-sm">
                <Lock className="size-3.5 shrink-0" aria-hidden />
                Demo account
              </span>
            ) : user.status === "PENDING" ? (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleUpdateUserStatus(user.id, "APPROVED")}
                  disabled={updateUserStatusMutation.isPending}
                >
                  <CheckCircle className="size-4" />
                  Approve Student
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => handleUpdateUserStatus(user.id, "REJECTED")}
                  disabled={updateUserStatusMutation.isPending}
                >
                  <XCircle className="size-4" />
                  Reject
                </Button>
              </>
            ) : (
              <>
                {user.role === "ADMIN" &&
                  user.id !== (currentUserId || session?.user?.id) && (
                    <Button
                      size="sm"
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={() => openRemoveAdminConfirm(user)}
                      disabled={removeAdminPrivilegesMutation.isPending}
                    >
                      <ShieldOff className="size-4" />
                      Remove Admin
                    </Button>
                  )}
                {user.role === "USER" && user.status === "APPROVED" && (
                  <Button
                    size="sm"
                    className="bg-purple-600 text-white hover:bg-purple-700"
                    onClick={() => openMakeAdminConfirm(user)}
                    disabled={updateUserRoleMutation.isPending}
                  >
                    <Shield className="size-4" />
                    Make Admin
                  </Button>
                )}
                {user.role === "ADMIN" &&
                  user.id === (currentUserId || session?.user?.id) && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 sm:text-sm">
                      <Shield className="size-3.5 shrink-0" aria-hidden />
                      You
                    </span>
                  )}
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
    <section className="admin-panel">
      {/* KPI Statistics Cards */}
      <StatCardGrid className="mb-4 sm:mb-6">
        <StatCard title="Total Users" value={users.length} icon={UsersIcon} hue="blue" />
        <StatCard
          title="Approved"
          value={approvedUserCount}
          icon={UserCheck}
          hue="emerald"
        />
        <StatCard
          title="Pending"
          value={pendingUserCount}
          icon={Hourglass}
          hue="amber"
        />
        <StatCard
          title="Rejected"
          value={rejectedUserCount}
          icon={XCircle}
          hue="rose"
        />
        <StatCard title="Admins" value={adminUserCount} icon={UserCog} hue="violet" />
        <StatCard
          title="Make Admin Requests"
          value={adminRequests.length}
          icon={Shield}
          hue="slate"
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
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-dark-400 placeholder:text-gray-500 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
          </form>
          {/* Filter Dropdowns */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end sm:gap-3">
            <FilterSelect
              label="Status"
              variant="light"
              className="w-full sm:min-w-[170px]"
              value={currentStatus || "all"}
              onValueChange={(v) => handleFilterChange("status", v)}
              options={userStatusFilterOptions()}
            />
            <FilterSelect
              label="Role"
              variant="light"
              className="w-full sm:min-w-[170px]"
              value={currentRole || "all"}
              onValueChange={(v) => handleFilterChange("role", v)}
              options={userRoleFilterOptions()}
            />
          </div>
        </div>
      </div>

      <DismissibleFilterChips
        variant="light"
        groups={[
          ...(currentStatus !== "all"
            ? [
                {
                  label: "Status",
                  values: [currentStatus],
                  onClear: () => handleFilterChange("status", "all"),
                  renderBadge: (value: string) => {
                    const opt = userStatusFilterOptions().find(
                      (o) => o.value === value,
                    );
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {opt?.label ?? value}
                      </span>
                    );
                  },
                },
              ]
            : []),
          ...(currentRole !== "all"
            ? [
                {
                  label: "Role",
                  values: [currentRole],
                  onClear: () => handleFilterChange("role", "all"),
                  renderBadge: (value: string) => {
                    const opt = userRoleFilterOptions().find(
                      (o) => o.value === value,
                    );
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                        {opt?.label ?? value}
                      </span>
                    );
                  },
                },
              ]
            : []),
        ]}
        onReset={clearFilters}
      />

      {/* Admin Requests Section - Only shows PENDING requests */}
      {adminRequests.length > 0 && (
        <div className="mt-4 sm:mt-6">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">
            Pending Admin Requests ({adminRequests.length})
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {adminRequests.map((request) => {
              const demoLocked = isProtectedDemoAccount({
                email: request.userEmail,
              });
              const actionsBusy =
                approveAdminRequestMutation.isPending ||
                rejectAdminRequestMutation.isPending;

              return (
              <div
                key={request.id}
                className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <PersonAttribution
                        person={{
                          id: request.userId,
                          fullName: request.userFullName,
                          email: request.userEmail,
                          universityCard: request.userUniversityCard ?? null,
                        }}
                        href={`/admin/users/${request.userId}`}
                        size={28}
                        className="text-sm text-yellow-800"
                        textClassName="text-yellow-900"
                      />
                    </div>
                    <p className="mb-2 text-xs text-yellow-800 sm:text-sm">
                      <strong>Reason:</strong> {request.requestReason}
                    </p>
                    <DateMetaLine icon={CalendarPlus} className="text-yellow-600">
                      Requested on:{" "}
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleString()
                        : "N/A"}
                    </DateMetaLine>
                  </div>
                  <div className="flex flex-col gap-2 sm:ml-4 sm:flex-row sm:items-start">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          size="sm"
                          className={
                            demoLocked
                              ? "bg-green-600/40 text-white/70 hover:bg-green-600/40"
                              : "bg-green-600 hover:bg-green-700"
                          }
                          onClick={() => openApproveConfirm(request)}
                          disabled={actionsBusy || demoLocked}
                          title={
                            demoLocked
                              ? "Demo account — role locked"
                              : undefined
                          }
                        >
                          <CheckCircle className="size-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => openDeclineDialog(request)}
                          disabled={actionsBusy}
                        >
                          <XCircle className="size-4" />
                          Decline
                        </Button>
                      </div>
                      {demoLocked ? (
                        <p className="inline-flex items-center gap-1 text-xs text-yellow-800">
                          <Lock className="size-3.5 shrink-0" aria-hidden />
                          Demo account — role locked (Decline still allowed).
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent decisions — who approved / rejected / withdrew (baseline; polish later) */}
      {recentDecisions.length > 0 && (
        <div className="mt-4 sm:mt-6">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">
            Recent decisions ({recentDecisions.length})
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {recentDecisions.map((decision) => {
              const withdrawn =
                decision.status === "REJECTED" &&
                decision.rejectionReason === ADMIN_REQUEST_WITHDRAWN_REASON;
              const statusLabel = withdrawn
                ? "Withdrawn"
                : decision.status === "APPROVED"
                  ? "Approved"
                  : "Rejected";
              const borderClass = withdrawn
                ? "border-gray-200 bg-gray-50"
                : decision.status === "APPROVED"
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50";
              const textClass = withdrawn
                ? "text-gray-800"
                : decision.status === "APPROVED"
                  ? "text-green-900"
                  : "text-red-900";
              const mutedClass = withdrawn
                ? "text-gray-600"
                : decision.status === "APPROVED"
                  ? "text-green-700"
                  : "text-red-700";

              return (
                <div
                  key={decision.id}
                  className={`rounded-lg border p-3 sm:p-4 ${borderClass}`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                        withdrawn
                          ? "bg-gray-200 text-gray-800"
                          : decision.status === "APPROVED"
                            ? "bg-green-200 text-green-900"
                            : "bg-red-200 text-red-900"
                      }`}
                    >
                      {decision.status === "APPROVED" ? (
                        <CheckCircle className="size-3" aria-hidden />
                      ) : (
                        <XCircle className="size-3" aria-hidden />
                      )}
                      {statusLabel}
                    </span>
                    <PersonAttribution
                      person={{
                        id: decision.userId,
                        fullName: decision.userFullName,
                        email: decision.userEmail,
                        universityCard: decision.userUniversityCard ?? null,
                      }}
                      href={`/admin/users/${decision.userId}`}
                      size={28}
                      className={`text-sm ${mutedClass}`}
                      textClassName={textClass}
                    />
                  </div>
                  <p
                    className={`mb-1 text-xs sm:text-sm ${mutedClass}`}
                    title={decision.requestReason}
                  >
                    <strong>Request:</strong>{" "}
                    {truncateDecisionText(decision.requestReason)}
                  </p>
                  {decision.rejectionReason && !withdrawn ? (
                    <p className={`mb-1 text-xs sm:text-sm ${mutedClass}`}>
                      <strong>Reason:</strong> {decision.rejectionReason}
                    </p>
                  ) : null}
                  <AdminRequestReviewerAttribution
                    reviewer={decision.reviewer}
                    prefix={
                      withdrawn
                        ? "Withdrawn by"
                        : decision.status === "APPROVED"
                          ? "Approved by"
                          : "Rejected by"
                    }
                    size={28}
                    className={`mt-2 text-xs sm:text-sm ${mutedClass}`}
                    textClassName={textClass}
                    href={
                      decision.reviewer?.id
                        ? `/admin/users/${decision.reviewer.id}`
                        : null
                    }
                  />
                  <DateMetaLine icon={CalendarCheck} className={`mt-1 ${mutedClass}`}>
                    {decision.reviewedAt
                      ? new Date(decision.reviewedAt).toLocaleString()
                      : "N/A"}
                  </DateMetaLine>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 w-full overflow-hidden sm:mt-7">
        <DataTable
          columns={userColumns}
          data={users}
          emptyMessage="No users found matching your criteria."
          initialPageSize={20}
        />
        {users.length === 0 && hasActiveFilters && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="outline"
              onClick={clearFilters}
              className="border-gray-300 text-dark-400 hover:bg-gray-100"
            >
              <FilterX className="size-4" />
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </section>

      <AlertDialog
        open={approveOpen}
        onOpenChange={(open) => {
          if (approveAdminRequestMutation.isPending) return;
          setApproveOpen(open);
          if (!open) setDecisionTarget(null);
        }}
      >
        <AlertDialogContent className="border-gray-600 bg-gray-800/95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-light-100">
              Promote to admin?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-light-200">
              Grant administrator privileges to{" "}
              <span className="font-medium text-light-100">
                {decisionTarget?.userFullName ?? "this user"}
              </span>
              {decisionTarget?.userEmail
                ? ` (${decisionTarget.userEmail})`
                : ""}
              ? They will be able to manage users, books, and borrow requests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={approveAdminRequestMutation.isPending}
              className="border-gray-500 bg-gray-600 text-white hover:bg-gray-500 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmApprove();
              }}
              disabled={approveAdminRequestMutation.isPending}
              className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
            >
              {approveAdminRequestMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle className="size-4" />
              )}
              {approveAdminRequestMutation.isPending
                ? "Promoting…"
                : "Promote to admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={roleTarget != null}
        onOpenChange={(open) => {
          if (
            updateUserRoleMutation.isPending ||
            removeAdminPrivilegesMutation.isPending
          ) {
            return;
          }
          if (!open) setRoleTarget(null);
        }}
      >
        <AlertDialogContent className="border-gray-600 bg-gray-800/95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-light-100">
              {roleTarget?.action === "remove"
                ? "Remove admin privileges?"
                : "Promote to admin?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-light-200">
              {roleTarget?.action === "remove" ? (
                <>
                  Remove administrator access from{" "}
                  <span className="font-medium text-light-100">
                    {roleTarget.fullName}
                  </span>
                  {roleTarget.email ? ` (${roleTarget.email})` : ""}? They will
                  become a standard library user and can request admin access
                  again later.
                </>
              ) : (
                <>
                  Grant administrator privileges to{" "}
                  <span className="font-medium text-light-100">
                    {roleTarget?.fullName ?? "this user"}
                  </span>
                  {roleTarget?.email ? ` (${roleTarget.email})` : ""}? They will
                  be able to manage users, books, and borrow requests.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                updateUserRoleMutation.isPending ||
                removeAdminPrivilegesMutation.isPending
              }
              className="border-gray-500 bg-gray-600 text-white hover:bg-gray-500 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRoleChange();
              }}
              disabled={
                updateUserRoleMutation.isPending ||
                removeAdminPrivilegesMutation.isPending
              }
              className={
                roleTarget?.action === "remove"
                  ? "gap-1.5 bg-red-600 text-white hover:bg-red-700"
                  : "gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
              }
            >
              {(updateUserRoleMutation.isPending ||
                removeAdminPrivilegesMutation.isPending) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {!updateUserRoleMutation.isPending &&
                !removeAdminPrivilegesMutation.isPending &&
                (roleTarget?.action === "remove" ? (
                  <ShieldOff className="size-4" />
                ) : (
                  <Shield className="size-4" />
                ))}
              {updateUserRoleMutation.isPending ||
              removeAdminPrivilegesMutation.isPending
                ? roleTarget?.action === "remove"
                  ? "Removing…"
                  : "Promoting…"
                : roleTarget?.action === "remove"
                  ? "Remove Admin"
                  : "Make Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminRequestDeclineDialog
        key={decisionTarget?.id ?? "admin-decline"}
        open={declineOpen}
        applicantName={decisionTarget?.userFullName ?? "Applicant"}
        applicantEmail={decisionTarget?.userEmail ?? ""}
        isPending={rejectAdminRequestMutation.isPending}
        onOpenChange={(open) => {
          setDeclineOpen(open);
          if (!open) setDecisionTarget(null);
        }}
        onConfirm={handleConfirmDecline}
      />
    </>
  );
};

export default AdminUsersList;
