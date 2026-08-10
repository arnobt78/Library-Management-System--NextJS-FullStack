"use client";

/**
 * Admin Requests list — dedicated make-admin privilege queue (/admin/admin-requests).
 *
 * Pending + recent decisions tables with SSR initialData; approve/decline densify
 * via admin-request.write invalidation (patchAdminRequestCaches + optimisticAdminRequestDecision).
 */

import React, { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle,
  Eye,
  Hourglass,
  Loader2,
  Lock,
  MoreVertical,
  Shield,
  X,
  XCircle,
} from "lucide-react";
import PersonAttribution from "@/components/PersonAttribution";
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import AdminRequestDeclineDialog from "@/components/admin/AdminRequestDeclineDialog";
import PrefetchLink from "@/components/PrefetchLink";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { SearchInput } from "@/components/ui/SearchInput";
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
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { AdminFilterEmptyState } from "@/components/admin/AdminFilterEmptyState";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import {
  usePendingAdminRequests,
  useRecentAdminRequestDecisions,
} from "@/hooks/useQueries";
import {
  useApproveAdminRequest,
  useRejectAdminRequest,
} from "@/hooks/useMutations";
import type { AdminRequest } from "@/lib/services/users";
import { ADMIN_REQUEST_WITHDRAWN_REASON } from "@/lib/admin/adminRequestConstants";
import { LIGHT_MENU } from "@/lib/ui/glassActionChrome";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { isProtectedDemoAccount } from "@/constants";
import { cn } from "@/lib/utils";

const REASON_SNIPPET_MAX = 80;
const DECISION_SNIPPET_MAX = 120;

function truncateText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function matchesAdminRequestSearch(request: AdminRequest, query: string): boolean {
  const q = query.toLowerCase();
  return (
    request.userFullName.toLowerCase().includes(q) ||
    request.userEmail.toLowerCase().includes(q) ||
    request.requestReason.toLowerCase().includes(q)
  );
}

function isWithdrawnDecision(decision: AdminRequest): boolean {
  return (
    decision.status === "REJECTED" &&
    decision.rejectionReason === ADMIN_REQUEST_WITHDRAWN_REASON
  );
}

function decisionStatusLabel(decision: AdminRequest): string {
  if (isWithdrawnDecision(decision)) return "Withdrawn";
  if (decision.status === "APPROVED") return "Approved";
  return "Rejected";
}

function DecisionStatusBadge({
  decision,
  detailHref,
}: {
  decision: AdminRequest;
  detailHref: string;
}) {
  const withdrawn = isWithdrawnDecision(decision);
  const approved = decision.status === "APPROVED";
  const badgeClass = withdrawn
    ? "bg-gray-200 text-gray-800"
    : approved
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";

  return (
    <PrefetchLink
      href={detailHref}
      prefetch={false}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium hover:opacity-90",
        badgeClass,
      )}
    >
      {approved ? (
        <CheckCircle className="size-3" aria-hidden />
      ) : (
        <XCircle className="size-3" aria-hidden />
      )}
      {decisionStatusLabel(decision)}
    </PrefetchLink>
  );
}

function PendingRowActions({
  request,
  onApprove,
  onDecline,
  actionsBusy,
}: {
  request: AdminRequest;
  onApprove: (request: AdminRequest) => void;
  onDecline: (request: AdminRequest) => void;
  actionsBusy: boolean;
}) {
  const demoLocked = isProtectedDemoAccount({ email: request.userEmail });
  const detailHref = `/admin/admin-requests/${request.id}`;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Admin request actions"
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
            View Details
          </PrefetchLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator className={LIGHT_MENU.separator} />
        <DropdownMenuItem
          className={`${LIGHT_MENU.item} text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700`}
          onSelect={() => onApprove(request)}
          disabled={actionsBusy || demoLocked}
          title={demoLocked ? "Demo account — role locked" : undefined}
        >
          {demoLocked ? (
            <Lock className="size-3.5" aria-hidden />
          ) : (
            <CheckCircle className="size-3.5" />
          )}
          Approve
        </DropdownMenuItem>
        <DropdownMenuItem
          className={`${LIGHT_MENU.item} text-red-700 focus:bg-red-50 focus:text-red-700 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700`}
          onSelect={() => onDecline(request)}
          disabled={actionsBusy}
        >
          <XCircle className="size-3.5" />
          Decline
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

interface AdminRequestsClientProps {
  /** Pending make-admin queue from SSR */
  initialPendingRequests?: AdminRequest[];
  /** Recent APPROVED/REJECTED decisions from SSR (reviewer attribution) */
  initialRecentDecisions?: AdminRequest[];
  successMessage?: string;
  errorMessage?: string;
}

export default function AdminRequestsClient({
  initialPendingRequests = [],
  initialRecentDecisions = [],
  successMessage,
  errorMessage,
}: AdminRequestsClientProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [decisionTarget, setDecisionTarget] = useState<AdminRequest | null>(
    null,
  );
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  const searchQuery = localSearch.trim();
  const hasActiveFilters = Boolean(searchQuery);

  const {
    data: pendingData,
    isLoading: pendingLoading,
    isError: pendingError,
    error: pendingErrorData,
  } = usePendingAdminRequests(initialPendingRequests);

  const { data: recentData } = useRecentAdminRequestDecisions(
    initialRecentDecisions,
  );

  const approveAdminRequestMutation = useApproveAdminRequest();
  const rejectAdminRequestMutation = useRejectAdminRequest();

  const pendingUniverse: AdminRequest[] = useMemo(
    () => ((pendingData ?? initialPendingRequests) || []) as AdminRequest[],
    [pendingData, initialPendingRequests],
  );

  const recentUniverse: AdminRequest[] = useMemo(
    () => ((recentData ?? initialRecentDecisions) || []) as AdminRequest[],
    [recentData, initialRecentDecisions],
  );

  const filteredPending = useMemo(() => {
    if (!searchQuery) return pendingUniverse;
    return pendingUniverse.filter((r) =>
      matchesAdminRequestSearch(r, searchQuery),
    );
  }, [pendingUniverse, searchQuery]);

  const filteredDecisions = useMemo(() => {
    if (!searchQuery) return recentUniverse;
    return recentUniverse.filter((r) =>
      matchesAdminRequestSearch(r, searchQuery),
    );
  }, [recentUniverse, searchQuery]);

  const approvedCount = recentUniverse.filter(
    (d) => d.status === "APPROVED",
  ).length;
  const rejectedCount = recentUniverse.filter(
    (d) => d.status === "REJECTED" && !isWithdrawnDecision(d),
  ).length;

  const actionsBusy =
    approveAdminRequestMutation.isPending ||
    rejectAdminRequestMutation.isPending;

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

  const clearFilters = () => setLocalSearch("");

  const pendingColumns = useMemo<ColumnDef<AdminRequest>[]>(
    () => [
      {
        id: "applicant",
        accessorKey: "userFullName",
        header: ({ column }) => (
          <SortableHeader column={column}>Applicant</SortableHeader>
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <PersonAttribution
              person={{
                id: r.userId,
                fullName: r.userFullName,
                email: r.userEmail,
                universityCard: r.userUniversityCard ?? null,
              }}
              href={`/admin/users/${r.userId}`}
              size={28}
            />
          );
        },
      },
      {
        accessorKey: "requestReason",
        header: "Reason",
        cell: ({ row }) => (
          <span
            className="text-xs text-muted-foreground sm:text-sm"
            title={row.original.requestReason}
          >
            {truncateText(row.original.requestReason, REASON_SNIPPET_MAX)}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <SortableHeader column={column}>Requested</SortableHeader>
        ),
        cell: ({ row }) => formatMediumDateTime(row.original.createdAt),
        sortingFn: (a, b) =>
          (a.original.createdAt
            ? new Date(a.original.createdAt).getTime()
            : 0) -
          (b.original.createdAt
            ? new Date(b.original.createdAt).getTime()
            : 0),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <PendingRowActions
            request={row.original}
            onApprove={openApproveConfirm}
            onDecline={openDeclineDialog}
            actionsBusy={actionsBusy}
          />
        ),
      },
    ],
    [actionsBusy],
  );

  const decisionColumns = useMemo<ColumnDef<AdminRequest>[]>(
    () => [
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <DecisionStatusBadge
            decision={row.original}
            detailHref={`/admin/admin-requests/${row.original.id}`}
          />
        ),
      },
      {
        id: "applicant",
        accessorKey: "userFullName",
        header: ({ column }) => (
          <SortableHeader column={column}>Applicant</SortableHeader>
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <PersonAttribution
              person={{
                id: r.userId,
                fullName: r.userFullName,
                email: r.userEmail,
                universityCard: r.userUniversityCard ?? null,
              }}
              href={`/admin/users/${r.userId}`}
              size={28}
            />
          );
        },
      },
      {
        accessorKey: "requestReason",
        header: "Request",
        cell: ({ row }) => (
          <span
            className="text-xs text-muted-foreground sm:text-sm"
            title={row.original.requestReason}
          >
            {truncateText(row.original.requestReason, DECISION_SNIPPET_MAX)}
          </span>
        ),
      },
      {
        id: "reviewer",
        header: "Actor",
        cell: ({ row }) => {
          const r = row.original;
          const withdrawn = isWithdrawnDecision(r);
          return (
            <AdminRequestReviewerAttribution
              reviewer={r.reviewer}
              prefix={
                withdrawn
                  ? "Withdrawn by"
                  : r.status === "APPROVED"
                    ? "Approved by"
                    : "Rejected by"
              }
              size={28}
              href={
                r.reviewer?.id ? `/admin/users/${r.reviewer.id}` : null
              }
            />
          );
        },
      },
      {
        accessorKey: "reviewedAt",
        header: ({ column }) => (
          <SortableHeader column={column}>Reviewed</SortableHeader>
        ),
        cell: ({ row }) => formatMediumDateTime(row.original.reviewedAt),
        sortingFn: (a, b) =>
          (a.original.reviewedAt
            ? new Date(a.original.reviewedAt).getTime()
            : 0) -
          (b.original.reviewedAt
            ? new Date(b.original.reviewedAt).getTime()
            : 0),
      },
    ],
    [],
  );

  if (
    pendingLoading &&
    pendingUniverse.length === 0 &&
    initialPendingRequests.length === 0
  ) {
    return (
      <AdminPageShell
        header={
          <AdminPageHeader
            title="Admin Requests"
            description="Review make-admin privilege applications"
            icon={Shield}
          />
        }
      >
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading admin requests…
        </div>
      </AdminPageShell>
    );
  }

  if (
    pendingError &&
    pendingUniverse.length === 0 &&
    initialPendingRequests.length === 0
  ) {
    return (
      <AdminPageShell
        header={
          <AdminPageHeader
            title="Admin Requests"
            description="Review make-admin privilege applications"
            icon={Shield}
          />
        }
      >
        <div className="py-6 text-center sm:py-8">
          <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
            Failed to load admin requests
          </p>
          <p className="text-xs text-gray-500 sm:text-sm">
            {pendingErrorData instanceof Error
              ? pendingErrorData.message
              : "An unknown error occurred"}
          </p>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <>
      <AdminPageShell
        header={
          <AdminPageHeader
            title="Admin Requests"
            description="Review make-admin privilege applications"
            icon={Shield}
          />
        }
        kpis={
          <StatCardGrid>
            <StatCard
              title="Pending"
              value={pendingUniverse.length}
              icon={Hourglass}
              hue="amber"
            />
            <StatCard
              title="Approved"
              value={approvedCount}
              icon={CheckCircle}
              hue="emerald"
            />
            <StatCard
              title="Rejected"
              value={rejectedCount}
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
          {successMessage ? (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500 sm:size-5" />
                <h3 className="text-xs font-medium text-green-800 sm:text-sm">
                  {successMessage === "admin-approved" &&
                    "Admin request approved successfully"}
                  {successMessage === "admin-rejected" &&
                    "Admin request declined successfully"}
                </h3>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <XCircle className="size-4 text-red-500 sm:size-5" />
                <h3 className="text-xs font-medium text-red-800 sm:text-sm">
                  Operation failed
                </h3>
              </div>
            </div>
          ) : null}

          <AdminListToolbar
            title="Admin Requests"
            count={filteredPending.length + filteredDecisions.length}
          >
            <SearchInput
              value={localSearch}
              onChange={setLocalSearch}
              placeholder="Search name, email, reason…"
              debounceMs={0}
              className="sm:min-w-64"
            />
          </AdminListToolbar>

          <AdminSurfacePanel className="mb-4 sm:mb-6">
            <h3 className="mb-3 text-base font-medium text-dark-400 sm:mb-4 sm:text-lg">
              Pending requests ({filteredPending.length})
            </h3>
            <DataTable
              columns={pendingColumns}
              data={filteredPending}
              emptyMessage={
                <AdminFilterEmptyState
                  entityLabel="pending admin requests"
                  filtered={hasActiveFilters}
                  onClear={clearFilters}
                  blankMessage="No pending admin requests."
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
                  blankMessage="No recent admin request decisions."
                  className="py-4 sm:py-6"
                />
              }
              initialPageSize={10}
            />
          </AdminSurfacePanel>
        </section>
      </AdminPageShell>

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
}
