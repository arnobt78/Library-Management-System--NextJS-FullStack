"use client";

/**
 * AccountRequestsClient — Sign-up Requests UI (route: /admin/account-requests).
 *
 * Pending user registrations (users.status = PENDING), not make-admin requests.
 * DataTable list + recent decisions; approve/reject via user mutations.
 */

import React, { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle,
  Eye,
  MoreVertical,
  Shield,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import PersonAttribution from "@/components/PersonAttribution";
import PrefetchLink from "@/components/PrefetchLink";
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import UserSkeleton from "@/components/skeletons/UserSkeleton";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { AdminFilterEmptyState } from "@/components/admin/AdminFilterEmptyState";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import { usePendingUsers, useSignupStatusDecisions } from "@/hooks/useQueries";
import { useApproveUser, useRejectUser } from "@/hooks/useMutations";
import type { User as UserType } from "@/lib/services/users";
import type { SignupStatusDecision } from "@/lib/admin/signupStatusDecisions";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { AccountStatusBadge } from "@/lib/ui/semanticBadges";
import { LIGHT_MENU } from "@/lib/ui/glassActionChrome";
import { formatMediumDate, formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";

interface AccountRequestsClientProps {
  initialUsers?: UserType[];
  initialRecentDecisions?: SignupStatusDecision[];
  currentAdmin: AdminRequestReviewer;
  successMessage?: string;
  errorMessage?: string;
}

function matchesPendingSearch(user: UserType, query: string): boolean {
  const q = query.toLowerCase();
  return (
    user.fullName.toLowerCase().includes(q) ||
    user.email.toLowerCase().includes(q) ||
    String(user.universityId).includes(q)
  );
}

function matchesDecisionSearch(decision: SignupStatusDecision, query: string): boolean {
  const q = query.toLowerCase();
  return (
    decision.fullName.toLowerCase().includes(q) ||
    decision.email.toLowerCase().includes(q) ||
    String(decision.universityId).includes(q) ||
    (decision.decisionActor?.fullName.toLowerCase().includes(q) ?? false) ||
    (decision.decisionActor?.email.toLowerCase().includes(q) ?? false)
  );
}

function DecisionStatusBadge({
  status,
}: {
  status: "APPROVED" | "REJECTED";
}) {
  const approved = status === "APPROVED";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        approved ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
      )}
    >
      {approved ? (
        <CheckCircle className="size-3" aria-hidden />
      ) : (
        <XCircle className="size-3" aria-hidden />
      )}
      {approved ? "Approved" : "Rejected"}
    </span>
  );
}

function PendingRowActions({
  user,
  onApprove,
  onReject,
  actionsBusy,
}: {
  user: UserType;
  onApprove: (user: UserType) => void;
  onReject: (user: UserType) => void;
  actionsBusy: boolean;
}) {
  const detailHref = `/admin/account-requests/${user.id}`;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Sign-up request actions"
          className={LIGHT_MENU.trigger}
          onClick={(e) => e.stopPropagation()}
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
            View
          </PrefetchLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator className={LIGHT_MENU.separator} />
        <DropdownMenuItem
          className={`${LIGHT_MENU.item} text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700`}
          onSelect={() => onApprove(user)}
          disabled={actionsBusy}
        >
          <CheckCircle className="size-3.5" />
          Approve Student
        </DropdownMenuItem>
        <DropdownMenuItem
          className={`${LIGHT_MENU.item} text-red-700 focus:bg-red-50 focus:text-red-700 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700`}
          onSelect={() => onReject(user)}
          disabled={actionsBusy}
        >
          <XCircle className="size-3.5" />
          Reject
        </DropdownMenuItem>
        <DropdownMenuSeparator className={LIGHT_MENU.separator} />
        <DropdownMenuItem className={LIGHT_MENU.item}>
          <X className="size-3.5" />
          Cancel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const AccountRequestsClient = ({
  initialUsers,
  initialRecentDecisions = [],
  currentAdmin,
  successMessage,
  errorMessage,
}: AccountRequestsClientProps) => {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const { data: session } = useSession();

  const currentSearch = searchParamsHook.get("search") || "";
  const [localSearch, setLocalSearch] = useState(currentSearch);
  const lastSyncedSearchRef = React.useRef(currentSearch);

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
    const timer = setTimeout(() => {
      if (localSearch !== currentSearch) {
        const params = new URLSearchParams(searchParamsHook.toString());
        const trimmedSearch = localSearch.trim();
        if (trimmedSearch) params.set("search", trimmedSearch);
        else params.delete("search");
        lastSyncedSearchRef.current = trimmedSearch;
        router.replace(`/admin/account-requests?${params.toString()}`, {
          scroll: false,
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, searchParamsHook, router]);

  const searchQuery = localSearch.trim();
  const hasActiveFilters = Boolean(searchQuery);

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorData,
  } = usePendingUsers(initialUsers, "");

  const { data: recentDecisionsData } = useSignupStatusDecisions(
    initialRecentDecisions,
  );

  const approveUserMutation = useApproveUser();
  const rejectUserMutation = useRejectUser();

  const pendingUniverse: UserType[] = useMemo(
    () => ((usersData ?? initialUsers) || []) as UserType[],
    [usersData, initialUsers],
  );

  const recentUniverse: SignupStatusDecision[] = useMemo(
    () => (recentDecisionsData ?? initialRecentDecisions) || [],
    [recentDecisionsData, initialRecentDecisions],
  );

  const filteredPending = useMemo(() => {
    if (!searchQuery) return pendingUniverse;
    return pendingUniverse.filter((u) => matchesPendingSearch(u, searchQuery));
  }, [pendingUniverse, searchQuery]);

  const filteredDecisions = useMemo(() => {
    if (!searchQuery) return recentUniverse;
    return recentUniverse.filter((d) =>
      matchesDecisionSearch(d, searchQuery),
    );
  }, [recentUniverse, searchQuery]);

  const actionsBusy =
    approveUserMutation.isPending || rejectUserMutation.isPending;

  // Prefer SSR currentAdmin (card + name) so Recent decisions never flash Robohash.
  const decisionActor = useCallback((): AdminRequestReviewer | null => {
    if (currentAdmin?.email) {
      return {
        id: currentAdmin.id,
        fullName: currentAdmin.fullName,
        email: currentAdmin.email,
        universityCard: currentAdmin.universityCard,
      };
    }
    const su = session?.user as
      | { id?: string; name?: string | null; email?: string | null }
      | undefined;
    if (!su?.email || !(su.name || su.email)) return null;
    return {
      id: su.id ?? null,
      fullName: su.name?.trim() || "Admin",
      email: su.email,
      universityCard: null,
    };
  }, [currentAdmin, session?.user]);

  const handleApproveUser = useCallback(
    (user: UserType) => {
      approveUserMutation.mutate({
        userId: user.id,
        userName: user.fullName,
        decisionActor: decisionActor(),
      });
    },
    [approveUserMutation, decisionActor],
  );

  const handleRejectUser = useCallback(
    (user: UserType) => {
      rejectUserMutation.mutate({
        userId: user.id,
        userName: user.fullName,
        decisionActor: decisionActor(),
      });
    },
    [rejectUserMutation, decisionActor],
  );

  const clearFilters = () => {
    setLocalSearch("");
    router.push("/admin/account-requests");
  };

  const pendingColumns = useMemo<ColumnDef<UserType>[]>(
    () => [
      {
        id: "name",
        accessorKey: "fullName",
        header: ({ column }) => (
          <SortableHeader column={column}>Name</SortableHeader>
        ),
        cell: ({ row }) => {
          const u = row.original;
          return (
            <PersonAttribution
              person={{
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                universityCard: u.universityCard ?? null,
              }}
              href={`/admin/account-requests/${u.id}`}
              size={28}
            />
          );
        },
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <SortableHeader column={column}>Email</SortableHeader>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground sm:text-sm">
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
        accessorKey: "createdAt",
        header: ({ column }) => (
          <SortableHeader column={column}>Registered</SortableHeader>
        ),
        cell: ({ row }) => formatMediumDate(row.original.createdAt),
        sortingFn: (a, b) =>
          (a.original.createdAt
            ? new Date(a.original.createdAt).getTime()
            : 0) -
          (b.original.createdAt
            ? new Date(b.original.createdAt).getTime()
            : 0),
      },
      {
        id: "status",
        header: "Status",
        cell: () => <AccountStatusBadge status="PENDING" />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <PendingRowActions
            user={row.original}
            onApprove={handleApproveUser}
            onReject={handleRejectUser}
            actionsBusy={actionsBusy}
          />
        ),
      },
    ],
    [actionsBusy, handleApproveUser, handleRejectUser],
  );

  const decisionColumns = useMemo<ColumnDef<SignupStatusDecision>[]>(
    () => [
      {
        id: "applicant",
        accessorKey: "fullName",
        header: ({ column }) => (
          <SortableHeader column={column}>Applicant</SortableHeader>
        ),
        cell: ({ row }) => {
          const d = row.original;
          return (
            <PersonAttribution
              person={{
                id: d.userId,
                fullName: d.fullName,
                email: d.email,
                universityCard: d.universityCard,
              }}
              href={`/admin/users/${d.userId}`}
              size={28}
            />
          );
        },
      },
      {
        id: "decision",
        accessorKey: "status",
        header: "Decision",
        cell: ({ row }) => (
          <DecisionStatusBadge status={row.original.status} />
        ),
      },
      {
        id: "actor",
        header: "Actor",
        cell: ({ row }) => {
          const d = row.original;
          return (
            <AdminRequestReviewerAttribution
              reviewer={d.decisionActor}
              prefix={
                d.status === "APPROVED" ? "Approved by" : "Rejected by"
              }
              size={28}
              href={
                d.decisionActor?.id
                  ? `/admin/users/${d.decisionActor.id}`
                  : null
              }
            />
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <SortableHeader column={column}>Registered</SortableHeader>
        ),
        cell: ({ row }) => formatMediumDate(row.original.createdAt),
        sortingFn: (a, b) =>
          (a.original.createdAt
            ? new Date(a.original.createdAt).getTime()
            : 0) -
          (b.original.createdAt
            ? new Date(b.original.createdAt).getTime()
            : 0),
      },
      {
        accessorKey: "decidedAt",
        header: ({ column }) => (
          <SortableHeader column={column}>Decided</SortableHeader>
        ),
        cell: ({ row }) => formatMediumDateTime(row.original.decidedAt),
        sortingFn: (a, b) =>
          (a.original.decidedAt
            ? new Date(a.original.decidedAt).getTime()
            : 0) -
          (b.original.decidedAt
            ? new Date(b.original.decidedAt).getTime()
            : 0),
      },
    ],
    [],
  );

  if (usersLoading && (!initialUsers || initialUsers.length === 0)) {
    return (
      <AdminPageShell
        header={
          <AdminPageHeader
            title="Registration Queue"
            description="Approve or reject new library sign-ups"
            icon={UserPlus}
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <UserSkeleton key={`user-skeleton-${i}`} variant="card" />
          ))}
        </div>
      </AdminPageShell>
    );
  }

  if (usersError && (!initialUsers || initialUsers.length === 0)) {
    return (
      <AdminPageShell
        header={
          <AdminPageHeader
            title="Registration Queue"
            description="Approve or reject new library sign-ups"
            icon={UserPlus}
          />
        }
      >
        <div className="py-6 text-center sm:py-8">
          <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
            Failed to load sign-up requests
          </p>
          <p className="text-xs text-gray-500 sm:text-sm">
            {usersErrorData instanceof Error
              ? usersErrorData.message
              : "An unknown error occurred"}
          </p>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      header={
        <AdminPageHeader
          title="Registration Queue"
          description="Approve or reject new library sign-ups"
          icon={UserPlus}
        />
      }
      kpis={
        <StatCardGrid>
          <StatCard
            title="Pending"
            value={pendingUniverse.length}
            icon={UserPlus}
            hue="amber"
          />
          <StatCard
            title="Recent Approved"
            value={
              recentUniverse.filter((d) => d.status === "APPROVED").length
            }
            icon={CheckCircle}
            hue="emerald"
          />
          <StatCard
            title="Recent Rejected"
            value={
              recentUniverse.filter((d) => d.status === "REJECTED").length
            }
            icon={XCircle}
            hue="rose"
          />
          <StatCard
            title="Total Decisions"
            value={recentUniverse.length}
            icon={Shield}
            hue="slate"
          />
        </StatCardGrid>
      }
    >
      <section className="admin-panel">
        <AdminListToolbar
          title="Registration Queue"
          count={filteredPending.length + filteredDecisions.length}
        >
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search name, email, ID…"
            debounceMs={0}
            className="sm:min-w-64"
          />
        </AdminListToolbar>

        {successMessage ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 sm:mb-6 sm:p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500 sm:size-5" />
              <h3 className="text-xs font-medium text-green-800 sm:text-sm">
                {successMessage === "account-approved" &&
                  "Account approved successfully"}
                {successMessage === "account-rejected" &&
                  "Account rejected successfully"}
              </h3>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 sm:mb-6 sm:p-4">
            <div className="flex items-center gap-2">
              <XCircle className="size-4 text-red-500 sm:size-5" />
              <h3 className="text-xs font-medium text-red-800 sm:text-sm">
                Operation failed
              </h3>
            </div>
          </div>
        ) : null}

        <AdminSurfacePanel className="mb-4 sm:mb-6">
          <h3 className="mb-3 text-base font-medium text-dark-400 sm:mb-4 sm:text-lg">
            Pending requests ({filteredPending.length})
          </h3>
          <DataTable
            columns={pendingColumns}
            data={filteredPending}
            emptyMessage={
              <AdminFilterEmptyState
                entityLabel="pending sign-up requests"
                filtered={hasActiveFilters}
                onClear={clearFilters}
                blankMessage="No pending sign-up requests."
                className="py-4 sm:py-6"
              />
            }
            initialPageSize={10}
          />
        </AdminSurfacePanel>

        <AdminSurfacePanel>
          <h3 className="mb-3 text-base font-medium text-dark-400 sm:mb-4 sm:text-lg">
            Recent decisions ({filteredDecisions.length})
          </h3>
          <DataTable
            columns={decisionColumns}
            data={filteredDecisions}
            emptyMessage={
              <AdminFilterEmptyState
                entityLabel="recent decisions"
                filtered={hasActiveFilters}
                onClear={clearFilters}
                blankMessage="No recent sign-up decisions."
                className="py-4 sm:py-6"
              />
            }
            initialPageSize={10}
          />
        </AdminSurfacePanel>
      </section>
    </AdminPageShell>
  );
};

export default AccountRequestsClient;
