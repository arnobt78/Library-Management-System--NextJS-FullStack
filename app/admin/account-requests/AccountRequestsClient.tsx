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
import { DecisionActorStack } from "@/components/admin/DecisionActorStack";
import CopyableText from "@/components/ui/CopyableText";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import UserSkeleton from "@/components/skeletons/UserSkeleton";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/filter-select";
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
import {
  usePendingUsers,
  useSignupStatusDecisions,
  useAdminNavCounts,
} from "@/hooks/useQueries";
import { useApproveUser, useRejectUser } from "@/hooks/useMutations";
import type { User as UserType } from "@/lib/services/users";
import type { SignupStatusDecision } from "@/lib/admin/signupStatusDecisions";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { AccountStatusBadge } from "@/lib/ui/semanticBadges";
import { LIGHT_MENU } from "@/lib/ui/glassActionChrome";
import {
  matchesListPeriod,
  periodFilterOptions,
  type ListPeriod,
} from "@/lib/ui/periodFilterOptions";

const PERIOD_OPTIONS = periodFilterOptions("light");

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

function matchesDecisionSearch(
  decision: SignupStatusDecision,
  query: string,
): boolean {
  const q = query.toLowerCase();
  return (
    decision.fullName.toLowerCase().includes(q) ||
    decision.email.toLowerCase().includes(q) ||
    String(decision.universityId).includes(q) ||
    (decision.decisionActor?.fullName.toLowerCase().includes(q) ?? false) ||
    (decision.decisionActor?.email.toLowerCase().includes(q) ?? false)
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
  /** Recent decisions period — client filter on FIFO-50 feed (default 7days). */
  const [decisionPeriod, setDecisionPeriod] =
    useState<ListPeriod>("7days");

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
  const { data: navCounts } = useAdminNavCounts();
  const pendingAdminRequests = navCounts?.pendingAdminRequests ?? 0;

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
    return recentUniverse.filter((d) => {
      if (!matchesListPeriod(d.decidedAt, decisionPeriod)) return false;
      if (!searchQuery) return true;
      return matchesDecisionSearch(d, searchQuery);
    });
  }, [recentUniverse, searchQuery, decisionPeriod]);

  const periodFilteredDecisionCount = useMemo(
    () =>
      recentUniverse.filter((d) =>
        matchesListPeriod(d.decidedAt, decisionPeriod),
      ).length,
    [recentUniverse, decisionPeriod],
  );

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
      { id?: string; name?: string | null; email?: string | null } | undefined;
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
        id: "applicant",
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
                person={{
                  id: u.id,
                  fullName: u.fullName,
                  email: u.email,
                  universityCard: u.universityCard ?? null,
                }}
                href={`/admin/account-requests/${u.id}`}
                meta={
                  <TicketDateMeta
                    createdAt={u.createdAt}
                    createdLabel="Registered"
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
        id: "status",
        size: 118,
        minSize: 110,
        header: "Status",
        cell: () => (
          <div className="inline-flex">
            <AccountStatusBadge status="PENDING" />
          </div>
        ),
      },
      {
        id: "actions",
        size: 64,
        minSize: 56,
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
        size: 220,
        minSize: 180,
        header: ({ column }) => (
          <SortableHeader column={column}>Applicant</SortableHeader>
        ),
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div
              className="flex min-w-0 flex-col leading-none"
              onClick={(e) => e.stopPropagation()}
            >
              <PersonAttribution
                layout="stack"
                size={36}
                person={{
                  id: d.userId,
                  fullName: d.fullName,
                  email: d.email,
                  universityCard: d.universityCard,
                }}
                href={`/admin/users/${d.userId}`}
                meta={
                  <TicketDateMeta
                    createdAt={d.createdAt}
                    createdLabel="Registered"
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
        id: "actor",
        size: 220,
        minSize: 180,
        header: "Decision & Actor",
        cell: ({ row }) => {
          const d = row.original;
          // Badge → signup detail (parity with Admin Requests DecisionStatus link).
          return (
            <DecisionActorStack
              status={d.status}
              actor={d.decisionActor}
              actorHref={
                d.decisionActor?.id
                  ? `/admin/users/${d.decisionActor.id}`
                  : null
              }
              decidedAt={d.decidedAt}
              badgeHref={`/admin/account-requests/${d.userId}`}
            />
          );
        },
      },
    ],
    [],
  );

  if (usersLoading && (!initialUsers || initialUsers.length === 0)) {
    return (
      <AdminPageShell
        header={
          <AdminPageHeader
            title="User Registration Queue"
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
            title="User Registration Queue"
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
          title="User Registration Queue"
          description="Approve or reject new library sign-ups"
          icon={UserPlus}
        />
      }
      kpis={
        <StatCardGrid>
          <StatCard
            title="Registration Pending"
            value={pendingUniverse.length}
            icon={UserPlus}
            hue="amber"
          />
          <StatCard
            title="Decisions Approved"
            value={recentUniverse.filter((d) => d.status === "APPROVED").length}
            icon={CheckCircle}
            hue="emerald"
          />
          <StatCard
            title="Decisions Rejected"
            value={recentUniverse.filter((d) => d.status === "REJECTED").length}
            icon={XCircle}
            hue="rose"
          />
          <StatCard
            title="Total Decisions"
            value={recentUniverse.length}
            icon={Shield}
            hue="slate"
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
              hue="violet"
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
      <section className="admin-panel space-y-6">
        <AdminListToolbar title="User Registration Queue">
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search name, email, ID…"
            debounceMs={0}
            className="sm:min-w-64"
          />
        </AdminListToolbar>

        {successMessage ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
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
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <XCircle className="size-4 text-red-500 sm:size-5" />
              <h3 className="text-xs font-medium text-red-800 sm:text-sm">
                Operation failed
              </h3>
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="mb-3 text-base font-medium text-dark-400 sm:mb-4 sm:text-lg">
            Student/User Sign-up Pending Requests ({filteredPending.length})
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
        </div>

        <div>
          <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-medium text-dark-400 sm:text-lg">
              Recent Student/User Sign-up Decisions (
              {periodFilteredDecisionCount})
            </h3>
            <FilterSelect
              label="Period"
              variant="light"
              labelLayout="embedded"
              value={decisionPeriod}
              onValueChange={(v) => setDecisionPeriod(v as ListPeriod)}
              options={PERIOD_OPTIONS}
              placeholder="Period"
              className="w-full sm:w-44 sm:min-w-[170px]"
            />
          </div>
          <DataTable
            columns={decisionColumns}
            data={filteredDecisions}
            emptyMessage={
              <AdminFilterEmptyState
                entityLabel="recent student/user sign-up decisions"
                filtered={hasActiveFilters || decisionPeriod !== "all"}
                onClear={() => {
                  clearFilters();
                  setDecisionPeriod("all");
                }}
                blankMessage="No recent student/user sign-up decisions yet."
                className="py-4 sm:py-6"
              />
            }
            initialPageSize={10}
          />
        </div>
      </section>
    </AdminPageShell>
  );
};

export default AccountRequestsClient;
