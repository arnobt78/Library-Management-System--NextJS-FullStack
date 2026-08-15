"use client";

/**
 * Admin Users directory — roles/status + densified Admin pending KPI.
 * Make-admin queue stays at /admin/admin-requests (KPI links there).
 * Mutations use commitMutationCache densify (user.write / admin-request.write).
 */

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PrefetchLink from "@/components/PrefetchLink";
import PersonAttribution from "@/components/PersonAttribution";
import { DecisionActorStack } from "@/components/admin/DecisionActorStack";
import CopyableText from "@/components/ui/CopyableText";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/filter-select";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import {
  userStatusFilterOptions,
  userRoleFilterOptions,
} from "@/lib/ui/filterOptionStyles";
import { useSession } from "next-auth/react";
import UserSkeleton from "@/components/skeletons/UserSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllUsers, useAdminNavCounts } from "@/hooks/useQueries";
import { ADMIN_USERS_UNFILTERED } from "@/lib/ui/adminListUniverse";
import {
  useUpdateUserRole,
  useApproveUser,
  useRejectUser,
  useRemoveAdminPrivileges,
  useApproveAdminRequest,
  useRejectAdminRequest,
} from "@/hooks/useMutations";
import AdminRequestDeclineDialog from "@/components/admin/AdminRequestDeclineDialog";
import type {
  User,
  UsersListResponse,
  UserFilters,
} from "@/lib/services/users";
import {
  Shield,
  ShieldOff,
  CheckCircle,
  XCircle,
  Lock,
  Loader2,
  Users as UsersIcon,
  UserCheck,
  Hourglass,
  UserCog,
  MoreVertical,
  Eye,
  X,
} from "lucide-react";
import { isProtectedDemoAccount } from "@/constants";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { AdminFilterEmptyState } from "@/components/admin/AdminFilterEmptyState";
import { UserRoleBadge } from "@/lib/ui/semanticBadges";
import { LIGHT_MENU } from "@/lib/ui/glassActionChrome";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { resolveDecisionActor } from "@/lib/admin/resolveDecisionActor";

interface AdminUsersListProps {
  initialUsers?: User[];
  successMessage?: string;
  errorMessage?: string;
  currentUserId?: string;
  /** SSR acting admin (DB card) — densify attribution without Robohash flash. */
  currentAdmin?: AdminRequestReviewer | null;
}

function UserRowActions({
  user,
  currentUserId,
  sessionUserId,
  onApprove,
  onReject,
  onMakeAdmin,
  onApproveAdmin,
  onDeclineAdmin,
  onRemoveAdmin,
  busy,
}: {
  user: User;
  currentUserId?: string;
  sessionUserId?: string;
  onApprove: () => void;
  onReject: () => void;
  onMakeAdmin: () => void;
  onApproveAdmin: () => void;
  onDeclineAdmin: () => void;
  onRemoveAdmin: () => void;
  busy: boolean;
}) {
  const selfId = currentUserId || sessionUserId;
  const detailHref = `/admin/users/${user.id}`;
  const pendingAdminId = user.pendingAdminRequestId;

  if (isProtectedDemoAccount(user)) {
    // Stacked Lock + Demo — fits Actions col size 64 (avoid inline "Demo account").
    return (
      <span
        className="inline-flex max-w-[3.25rem] flex-col items-center gap-0.5 leading-none text-gray-500"
        title="Demo account"
      >
        <Lock className="size-3.5 shrink-0" aria-hidden />
        <span className="text-xs font-medium">Demo</span>
      </span>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User actions"
          className={LIGHT_MENU.trigger}
          onClick={(e) => e.stopPropagation()}
          disabled={busy}
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={LIGHT_MENU.content}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem asChild className={LIGHT_MENU.item}>
          <PrefetchLink href={detailHref} prefetch={false}>
            <Eye className="size-3.5" />
            View profile
          </PrefetchLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator className={LIGHT_MENU.separator} />
        {user.status === "PENDING" && (
          <>
            <DropdownMenuItem
              className={`${LIGHT_MENU.item} text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700`}
              onSelect={onApprove}
              disabled={busy}
            >
              <CheckCircle className="size-3.5" />
              Approve Student
            </DropdownMenuItem>
            <DropdownMenuItem
              className={`${LIGHT_MENU.item} text-red-700 focus:bg-red-50 focus:text-red-700 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700`}
              onSelect={onReject}
              disabled={busy}
            >
              <XCircle className="size-3.5" />
              Reject
            </DropdownMenuItem>
          </>
        )}
        {user.status === "APPROVED" &&
          user.role === "USER" &&
          pendingAdminId && (
            <>
              <DropdownMenuItem
                className={`${LIGHT_MENU.item} text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700`}
                onSelect={onApproveAdmin}
                disabled={busy}
              >
                <CheckCircle className="size-3.5" />
                Approve Admin
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`${LIGHT_MENU.item} text-red-700 focus:bg-red-50 focus:text-red-700 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700`}
                onSelect={onDeclineAdmin}
                disabled={busy}
              >
                <XCircle className="size-3.5" />
                Decline
              </DropdownMenuItem>
            </>
          )}
        {user.status === "APPROVED" &&
          user.role === "USER" &&
          !pendingAdminId && (
            <DropdownMenuItem
              className={`${LIGHT_MENU.item} text-violet-700 focus:bg-violet-50 focus:text-violet-700 data-[highlighted]:bg-violet-50 data-[highlighted]:text-violet-700`}
              onSelect={onMakeAdmin}
              disabled={busy}
            >
              <Shield className="size-3.5" />
              Make Admin
            </DropdownMenuItem>
          )}
        {user.role === "ADMIN" && user.id !== selfId && (
          <DropdownMenuItem
            className={LIGHT_MENU.itemDestructive}
            onSelect={onRemoveAdmin}
            disabled={busy}
          >
            <ShieldOff className="size-3.5" />
            Remove Admin
          </DropdownMenuItem>
        )}
        {user.role === "ADMIN" && user.id === selfId && (
          <DropdownMenuItem className={LIGHT_MENU.item} disabled>
            <Shield className="size-3.5" />
            You
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className={LIGHT_MENU.separator} />
        <DropdownMenuItem className={LIGHT_MENU.item}>
          <X className="size-3.5" />
          Cancel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const AdminUsersList: React.FC<AdminUsersListProps> = ({
  initialUsers,
  successMessage,
  errorMessage,
  currentUserId,
  currentAdmin = null,
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  // Prefer SSR card; session fallback is name/email only (JWT has no card).
  const decisionActor = resolveDecisionActor(
    currentAdmin,
    session?.user as
      | { id?: string; name?: string | null; email?: string | null }
      | undefined,
  );

  const currentSearch = searchParamsHook.get("search") || "";
  const currentStatus = searchParamsHook.get("status") || "all";
  const currentRole = searchParamsHook.get("role") || "all";
  const currentSort = searchParamsHook.get("sort") || "created";

  const [localSearch, setLocalSearch] = useState(currentSearch);
  const lastSyncedSearchRef = React.useRef(currentSearch);
  const [roleTarget, setRoleTarget] = useState<{
    id: string;
    fullName: string;
    email: string;
    universityCard?: string | null;
    action: "make" | "remove";
  } | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== currentSearch) {
        const params = new URLSearchParams(searchParamsHook.toString());
        const trimmedSearch = localSearch.trim();
        if (trimmedSearch) params.set("search", trimmedSearch);
        else params.delete("search");
        // Default sort stays in filters (`|| "created"`) — do not force URL rewrite.
        lastSyncedSearchRef.current = trimmedSearch;
        router.replace(`/admin/users?${params.toString()}`, { scroll: false });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, searchParamsHook, router]);

  const filters: UserFilters = React.useMemo(
    () => ({
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
    }),
    [currentSearch, currentStatus, currentRole, currentSort],
  );

  const searchQuery = localSearch.trim();
  const hasDisplayFilters = Boolean(
    searchQuery || currentStatus !== "all" || currentRole !== "all",
  );
  const hasActiveFilters = Boolean(
    currentSearch || currentStatus !== "all" || currentRole !== "all",
  );

  const ssrUsersResponse = React.useMemo(
    (): UsersListResponse | undefined =>
      initialUsers
        ? {
            users: initialUsers,
            total: initialUsers.length,
            page: 1,
            totalPages: 1,
            limit: initialUsers.length,
          }
        : undefined,
    [initialUsers],
  );

  const initialUsersData: UsersListResponse | undefined = !hasActiveFilters
    ? ssrUsersResponse
    : undefined;

  const { data: universeUsersData } = useAllUsers(
    ADMIN_USERS_UNFILTERED,
    ssrUsersResponse,
  );
  const universeUsers: User[] = React.useMemo(
    () => (universeUsersData?.users ?? initialUsers ?? []) as User[],
    [universeUsersData, initialUsers],
  );

  const {
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorData,
  } = useAllUsers(filters, initialUsersData);

  /** Shared with sidebar — densify via patchAdminNavCounts on admin-request.write. */
  const { data: navCounts } = useAdminNavCounts();
  const pendingAdminRequests = navCounts?.pendingAdminRequests ?? 0;

  const updateUserRoleMutation = useUpdateUserRole();
  const approveUserMutation = useApproveUser();
  const rejectUserMutation = useRejectUser();
  const removeAdminPrivilegesMutation = useRemoveAdminPrivileges();
  const approveAdminRequestMutation = useApproveAdminRequest();
  const rejectAdminRequestMutation = useRejectAdminRequest();
  const [declineAdminTarget, setDeclineAdminTarget] = useState<User | null>(
    null,
  );

  const updateSearchParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParamsHook.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    });
    // Do not inject default sort into the URL (avoids remount/avatar blink).
    router.replace(`/admin/users?${params.toString()}`, { scroll: false });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateSearchParams({ [key]: value });
  };

  const clearFilters = () => {
    setLocalSearch("");
    router.push("/admin/users");
  };

  React.useEffect(() => {
    if (
      currentSearch !== lastSyncedSearchRef.current &&
      localSearch === lastSyncedSearchRef.current
    ) {
      setLocalSearch(currentSearch);
      lastSyncedSearchRef.current = currentSearch;
    }
  }, [currentSearch, localSearch]);

  const users: User[] = React.useMemo(() => {
    const base =
      universeUsers.length > 0 ? universeUsers : (initialUsers ?? []);
    if (!hasDisplayFilters) return base;
    const q = searchQuery.toLowerCase();
    return base.filter((u) => {
      if (currentStatus !== "all" && u.status !== currentStatus) return false;
      if (currentRole !== "all" && u.role !== currentRole) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.universityId).includes(q)
      );
    });
  }, [
    universeUsers,
    initialUsers,
    hasDisplayFilters,
    searchQuery,
    currentStatus,
    currentRole,
  ]);

  const openMakeAdminConfirm = (user: User) => {
    setRoleTarget({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      universityCard: user.universityCard ?? null,
      action: "make",
    });
  };

  const openRemoveAdminConfirm = (user: User) => {
    setRoleTarget({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      universityCard: user.universityCard ?? null,
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
          userEmail: roleTarget.email,
          userUniversityCard: roleTarget.universityCard ?? null,
          decisionActor,
        },
        { onSuccess: () => setRoleTarget(null) },
      );
      return;
    }
    removeAdminPrivilegesMutation.mutate(
      {
        userId: roleTarget.id,
        userName: roleTarget.fullName,
        userEmail: roleTarget.email,
        userUniversityCard: roleTarget.universityCard ?? null,
        decisionActor,
      },
      { onSuccess: () => setRoleTarget(null) },
    );
  };

  const handleUpdateUserStatus = (
    userId: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    const user = users.find((u) => u.id === userId);
    const payload = {
      userId,
      userName: user?.fullName,
      decisionActor,
    };
    if (status === "APPROVED") {
      approveUserMutation.mutate(payload);
      return;
    }
    rejectUserMutation.mutate(payload);
  };

  const handleApproveAdminRequest = (user: User) => {
    if (!user.pendingAdminRequestId) return;
    approveAdminRequestMutation.mutate({
      requestId: user.pendingAdminRequestId,
      userName: user.fullName,
      decisionActor,
    });
  };

  const handleConfirmDeclineAdmin = (rejectionReason: string) => {
    if (!declineAdminTarget?.pendingAdminRequestId) return;
    rejectAdminRequestMutation.mutate(
      {
        requestId: declineAdminTarget.pendingAdminRequestId,
        rejectionReason,
        userName: declineAdminTarget.fullName,
        decisionActor,
      },
      {
        onSuccess: () => setDeclineAdminTarget(null),
      },
    );
  };

  const actionsBusy =
    approveUserMutation.isPending ||
    rejectUserMutation.isPending ||
    updateUserRoleMutation.isPending ||
    removeAdminPrivilegesMutation.isPending ||
    approveAdminRequestMutation.isPending ||
    rejectAdminRequestMutation.isPending;

  if (usersLoading && users.length === 0) {
    return (
      <section className="admin-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium sm:text-xl">
            Library User/Admin Management
          </h2>
        </div>
        <div className="mt-4 w-full sm:mt-7">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  {[...Array(5)].map((_, i) => (
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

  if (usersError && users.length === 0) {
    return (
      <section className="admin-panel">
        <div className="py-6 text-center sm:py-8">
          <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
            Failed to load users
          </p>
          <p className="text-xs text-gray-500 sm:text-sm">
            {usersErrorData instanceof Error
              ? usersErrorData.message
              : "An unknown error occurred"}
          </p>
        </div>
      </section>
    );
  }

  const approvedUserCount = universeUsers.filter(
    (u) => u.status === "APPROVED",
  ).length;
  const pendingUserCount = universeUsers.filter(
    (u) => u.status === "PENDING",
  ).length;
  const rejectedUserCount = universeUsers.filter(
    (u) => u.status === "REJECTED",
  ).length;
  const adminUserCount = universeUsers.filter((u) => u.role === "ADMIN").length;

  const userColumns: ColumnDef<User>[] = [
    {
      accessorKey: "fullName",
      size: 260,
      minSize: 200,
      header: ({ column }) => (
        <SortableHeader column={column}>Users</SortableHeader>
      ),
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div
            className="flex min-w-0 flex-col leading-none"
            onClick={(e) => e.stopPropagation()}
          >
            <PersonAttribution
              layout="stack"
              size={36}
              href={`/admin/users/${u.id}`}
              person={{
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                universityCard: u.universityCard ?? null,
              }}
              meta={
                <TicketDateMeta
                  createdAt={u.createdAt}
                  createdLabel="Joined"
                  hideUpdated
                />
              }
            />
          </div>
        );
      },
    },
    {
      accessorKey: "universityId",
      size: 130,
      minSize: 110,
      header: ({ column }) => (
        <SortableHeader column={column}>University ID</SortableHeader>
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <CopyableText
            value={String(row.original.universityId)}
            label="university ID"
          />
        </div>
      ),
    },
    {
      accessorKey: "role",
      size: 110,
      minSize: 96,
      header: "Role",
      cell: ({ row }) => (
        <div className="inline-flex">
          <UserRoleBadge role={row.original.role} />
        </div>
      ),
    },
    {
      accessorKey: "status",
      size: 220,
      minSize: 180,
      header: ({ column }) => (
        <SortableHeader column={column}>Status</SortableHeader>
      ),
      cell: ({ row }) => {
        const u = row.original;
        const status = u.status || "PENDING";
        const showActor =
          (status === "APPROVED" || status === "REJECTED") &&
          Boolean(u.statusReviewedById || u.statusReviewedByName);
        return (
          <DecisionActorStack
            status={status}
            showActor={showActor}
            actor={
              u.statusReviewedById || u.statusReviewedByName
                ? {
                    id: u.statusReviewedById ?? "",
                    fullName: u.statusReviewedByName ?? "an admin",
                    email: u.statusReviewedByEmail ?? "",
                    universityCard:
                      u.statusReviewedByUniversityCard ?? null,
                  }
                : null
            }
            actorHref={
              u.statusReviewedById
                ? `/admin/users/${u.statusReviewedById}`
                : null
            }
            decidedAt={u.statusReviewedAt}
          />
        );
      },
    },
    {
      id: "actions",
      size: 64,
      minSize: 56,
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <UserRowActions
            user={user}
            currentUserId={currentUserId}
            sessionUserId={session?.user?.id}
            busy={actionsBusy}
            onApprove={() => handleUpdateUserStatus(user.id, "APPROVED")}
            onReject={() => handleUpdateUserStatus(user.id, "REJECTED")}
            onMakeAdmin={() => openMakeAdminConfirm(user)}
            onApproveAdmin={() => handleApproveAdminRequest(user)}
            onDeclineAdmin={() => setDeclineAdminTarget(user)}
            onRemoveAdmin={() => openRemoveAdminConfirm(user)}
          />
        );
      },
    },
  ];

  return (
    <>
      <AdminPageShell
        header={
          <AdminPageHeader
            title="User/Admin Management"
            description="Directory of library accounts, roles, and pending admin requests"
            icon={UsersIcon}
          />
        }
        kpis={
          <StatCardGrid>
            <StatCard
              title="All Accounts"
              value={universeUsers.length}
              icon={UsersIcon}
              hue="blue"
            />
            <StatCard
              title="Approved Accounts"
              value={approvedUserCount}
              icon={UserCheck}
              hue="emerald"
            />
            <StatCard
              title="Registration Pending"
              value={pendingUserCount}
              icon={Hourglass}
              hue="amber"
            />
            <StatCard
              title="Rejected Accounts"
              value={rejectedUserCount}
              icon={XCircle}
              hue="rose"
            />
            <StatCard
              title="Admin Accounts"
              value={adminUserCount}
              icon={UserCog}
              hue="violet"
            />
            <PrefetchLink
              href="/admin/admin-requests"
              className="block rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Admin Pending: ${pendingAdminRequests}. Open Admin Requests.`}
            >
              <StatCard
                title="Admin Pending"
                value={pendingAdminRequests}
                icon={Shield}
                hue="slate"
                badges={
                  pendingAdminRequests > 0
                    ? [{ label: "Open Queue", hue: "amber" }]
                    : undefined
                }
              />
            </PrefetchLink>
          </StatCardGrid>
        }
      >
        <section className="admin-panel">
          {successMessage && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
              <h3 className="text-sm font-medium text-green-800">
                {successMessage === "role-updated" &&
                  "Role Updated Successfully!"}
                {successMessage === "user-approved" &&
                  "User Approved Successfully!"}
                {successMessage === "user-rejected" &&
                  "User Rejected Successfully!"}
                {successMessage === "admin-removed" &&
                  "Admin Privileges Removed Successfully!"}
              </h3>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
              <h3 className="text-sm font-medium text-red-800">
                Operation Failed
              </h3>
            </div>
          )}

          <AdminListToolbar
            title="Library User/Admin Management"
            count={users.length}
            chips={
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
            }
          >
            <SearchInput
              value={localSearch}
              onChange={setLocalSearch}
              placeholder="Search users…"
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
              options={userStatusFilterOptions()}
            />
            <FilterSelect
              label="Role"
              variant="light"
              labelLayout="embedded"
              className="shrink-0 sm:min-w-[150px]"
              value={currentRole || "all"}
              onValueChange={(v) => handleFilterChange("role", v)}
              options={userRoleFilterOptions()}
            />
          </AdminListToolbar>

          <div className="mt-4 w-full sm:mt-7">
            <DataTable
              columns={userColumns}
              data={users}
              emptyMessage={
                <AdminFilterEmptyState
                  entityLabel="users"
                  filtered={hasDisplayFilters}
                  onClear={clearFilters}
                  blankMessage="No users found."
                  className="py-4 sm:py-6"
                />
              }
              initialPageSize={20}
            />
          </div>
        </section>
      </AdminPageShell>

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

      {declineAdminTarget?.pendingAdminRequestId ? (
        <AdminRequestDeclineDialog
          key={declineAdminTarget.pendingAdminRequestId}
          open={declineAdminTarget != null}
          applicantName={declineAdminTarget.fullName}
          applicantEmail={declineAdminTarget.email}
          isPending={rejectAdminRequestMutation.isPending}
          onOpenChange={(open) => {
            if (!open && !rejectAdminRequestMutation.isPending) {
              setDeclineAdminTarget(null);
            }
          }}
          onConfirm={handleConfirmDeclineAdmin}
        />
      ) : null}
    </>
  );
};

export default AdminUsersList;
