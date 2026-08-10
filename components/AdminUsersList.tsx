"use client";

/**
 * Admin Users directory — roles/status only.
 * Make-admin queue lives at /admin/admin-requests (separate IA).
 * Mutations use commitMutationCache densify (user.write / admin-request.write).
 */

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PrefetchLink from "@/components/PrefetchLink";
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
import { useAllUsers } from "@/hooks/useQueries";
import { ADMIN_USERS_UNFILTERED } from "@/lib/ui/adminListUniverse";
import {
  useUpdateUserRole,
  useApproveUser,
  useRejectUser,
  useRemoveAdminPrivileges,
} from "@/hooks/useMutations";
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
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { TABLE_CELL_TITLE } from "@/lib/ui/tableCellStyles";
import { AccountStatusBadge } from "@/lib/ui/semanticBadges";
import { LIGHT_MENU } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";

interface AdminUsersListProps {
  initialUsers?: User[];
  successMessage?: string;
  errorMessage?: string;
  currentUserId?: string;
}

function UserRowActions({
  user,
  currentUserId,
  sessionUserId,
  onApprove,
  onReject,
  onMakeAdmin,
  onRemoveAdmin,
  busy,
}: {
  user: User;
  currentUserId?: string;
  sessionUserId?: string;
  onApprove: () => void;
  onReject: () => void;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  busy: boolean;
}) {
  const selfId = currentUserId || sessionUserId;
  const detailHref = `/admin/users/${user.id}`;

  if (isProtectedDemoAccount(user)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500 sm:text-sm">
        <Lock className="size-3.5 shrink-0" aria-hidden />
        Demo account
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
        {user.status === "APPROVED" && user.role === "USER" && (
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
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParamsHook = useSearchParams();

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
        if (!params.get("sort")) params.set("sort", "created");
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

  const updateUserRoleMutation = useUpdateUserRole();
  const approveUserMutation = useApproveUser();
  const rejectUserMutation = useRejectUser();
  const removeAdminPrivilegesMutation = useRemoveAdminPrivileges();

  const updateSearchParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParamsHook.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    });
    if (!params.get("sort")) params.set("sort", "created");
    router.replace(`/admin/users?${params.toString()}`, { scroll: false });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateSearchParams({ [key]: value });
  };

  const clearFilters = () => {
    setLocalSearch("");
    router.push("/admin/users?sort=created");
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

  React.useEffect(() => {
    if (!searchParamsHook.get("sort")) {
      const params = new URLSearchParams(searchParamsHook.toString());
      params.set("sort", "created");
      router.replace(`/admin/users?${params.toString()}`, { scroll: false });
    }
  }, [searchParamsHook, router]);

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
      },
      { onSuccess: () => setRoleTarget(null) },
    );
  };

  const handleUpdateUserStatus = (
    userId: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    const user = users.find((u) => u.id === userId);
    const su = session?.user as
      | { id?: string; name?: string | null; email?: string | null }
      | undefined;
    const decisionActor =
      su?.email && (su.name || su.email)
        ? {
            id: su.id ?? null,
            fullName: su.name?.trim() || "Admin",
            email: su.email,
            universityCard: null as string | null,
          }
        : null;
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

  const actionsBusy =
    approveUserMutation.isPending ||
    rejectUserMutation.isPending ||
    updateUserRoleMutation.isPending ||
    removeAdminPrivilegesMutation.isPending;

  if (usersLoading && users.length === 0) {
    return (
      <section className="admin-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium sm:text-xl">User Management</h2>
        </div>
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
      header: ({ column }) => (
        <SortableHeader column={column}>Name</SortableHeader>
      ),
      cell: ({ row }) => (
        <PrefetchLink
          prefetch={false}
          href={`/admin/users/${row.original.id}`}
          className={cn(TABLE_CELL_TITLE, SKY_LINK_LIGHT)}
        >
          {row.original.fullName}
        </PrefetchLink>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <SortableHeader column={column}>Email</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: "universityId",
      header: ({ column }) => (
        <SortableHeader column={column}>University ID</SortableHeader>
      ),
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
      header: ({ column }) => (
        <SortableHeader column={column}>Status</SortableHeader>
      ),
      cell: ({ row }) => (
        <AccountStatusBadge status={row.original.status || "PENDING"} />
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <SortableHeader column={column}>Joined</SortableHeader>
      ),
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
          <UserRowActions
            user={user}
            currentUserId={currentUserId}
            sessionUserId={session?.user?.id}
            busy={actionsBusy}
            onApprove={() => handleUpdateUserStatus(user.id, "APPROVED")}
            onReject={() => handleUpdateUserStatus(user.id, "REJECTED")}
            onMakeAdmin={() => openMakeAdminConfirm(user)}
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
            title="User Management"
            description="Directory of library accounts and roles"
            icon={UsersIcon}
          />
        }
        kpis={
          <StatCardGrid>
            <StatCard
              title="Total Users"
              value={universeUsers.length}
              icon={UsersIcon}
              hue="blue"
            />
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
            <StatCard
              title="Admins"
              value={adminUserCount}
              icon={UserCog}
              hue="violet"
            />
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
            title="User Management"
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

          <div className="mt-4 w-full overflow-hidden sm:mt-7">
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
    </>
  );
};

export default AdminUsersList;
