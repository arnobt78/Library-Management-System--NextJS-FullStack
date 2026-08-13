"use client";

/**
 * Admin Borrow Queue — KPI row + search/status filters + one TanStack DataTable
 * (Book Reviews / Support Tickets DNA). Kebab: View Details + approve/reject/return.
 * Parent: borrow queue polish
 */

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bookmark,
  BookOpen,
  CheckCircle,
  Eye,
  Hourglass,
  Loader2,
  MoreVertical,
  RotateCcw,
  Undo2,
  X,
  XCircle,
} from "lucide-react";
import { useBorrowRequests } from "@/hooks/useQueries";
import {
  useApproveBorrow,
  useRejectBorrow,
  useReturnBook,
} from "@/hooks/useMutations";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import { ADMIN_BORROW_REQUESTS_UNFILTERED } from "@/lib/ui/adminListUniverse";
import { BorrowStatusBadge } from "@/lib/ui/semanticBadges";
import { borrowStatusFilterOptions } from "@/lib/ui/filterOptionStyles";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/filter-select";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminFilterEmptyState } from "@/components/admin/AdminFilterEmptyState";
import { AdminBookIdentityCell } from "@/components/admin/AdminBookIdentityCell";
import { BorrowLifecycleDates } from "@/components/admin/BorrowLifecycleDates";
import PersonAttribution from "@/components/PersonAttribution";
import PrefetchLink from "@/components/PrefetchLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LIGHT_MENU } from "@/lib/ui/glassActionChrome";
import { useSession } from "next-auth/react";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { resolveDecisionActor } from "@/lib/admin/resolveDecisionActor";

interface AdminBookRequestsListProps {
  initialRequests?: BorrowRecordWithDetails[];
  /** SSR DB actor — preferred over useSession for lifecycle densify card. */
  currentAdmin?: AdminRequestReviewer | null;
  successMessage?: string;
  errorMessage?: string;
}

function BorrowRowActions({
  request,
  currentAdmin,
}: {
  request: BorrowRecordWithDetails;
  currentAdmin?: AdminRequestReviewer | null;
}) {
  const { data: session } = useSession();
  const decisionActor =
    resolveDecisionActor(currentAdmin, session?.user) ?? undefined;
  const approveBorrowMutation = useApproveBorrow();
  const rejectBorrowMutation = useRejectBorrow();
  const returnBookMutation = useReturnBook();
  const [actionKind, setActionKind] = useState<
    "approve" | "reject" | "return" | null
  >(null);

  const busy =
    approveBorrowMutation.isPending ||
    rejectBorrowMutation.isPending ||
    returnBookMutation.isPending;
  const detailHref = `/admin/book-requests/${request.id}`;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Borrow request actions"
          className={LIGHT_MENU.trigger}
          onClick={(e) => e.stopPropagation()}
        >
          {busy && actionKind ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MoreVertical className="size-4" />
          )}
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
        {request.status === "PENDING" ? (
          <>
            <DropdownMenuItem
              className={`${LIGHT_MENU.item} text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700`}
              disabled={busy}
              onSelect={() => {
                setActionKind("approve");
                approveBorrowMutation.mutate(
                  {
                    recordId: request.id,
                    bookTitle: request.bookTitle || undefined,
                    userName: request.userName || undefined,
                    decisionActor,
                  },
                  { onSettled: () => setActionKind(null) },
                );
              }}
            >
              <CheckCircle className="size-3.5" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              className={`${LIGHT_MENU.item} text-rose-700 focus:bg-rose-50 focus:text-rose-700 data-[highlighted]:bg-rose-50 data-[highlighted]:text-rose-700`}
              disabled={busy}
              onSelect={() => {
                setActionKind("reject");
                rejectBorrowMutation.mutate(
                  {
                    recordId: request.id,
                    bookTitle: request.bookTitle || undefined,
                    userName: request.userName || undefined,
                  },
                  { onSettled: () => setActionKind(null) },
                );
              }}
            >
              <XCircle className="size-3.5" />
              Reject
            </DropdownMenuItem>
          </>
        ) : null}
        {request.status === "BORROWED" ? (
          <DropdownMenuItem
            className={`${LIGHT_MENU.item} text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700`}
            disabled={busy}
            onSelect={() => {
              setActionKind("return");
              returnBookMutation.mutate(
                {
                  recordId: request.id,
                  bookTitle: request.bookTitle || undefined,
                  decisionActor,
                },
                { onSettled: () => setActionKind(null) },
              );
            }}
          >
            <Undo2 className="size-3.5" />
            Mark Returned
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator className={LIGHT_MENU.separator} />
        <DropdownMenuItem className={LIGHT_MENU.item}>
          <X className="size-3.5" />
          Cancel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const AdminBookRequestsList: React.FC<AdminBookRequestsListProps> = ({
  initialRequests,
  currentAdmin = null,
  successMessage,
  errorMessage,
}) => {
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  const currentSearch = searchParamsHook.get("search") || "";
  const currentStatus = searchParamsHook.get("status") || "all";

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
        if (trimmedSearch) {
          params.set("search", trimmedSearch);
        } else {
          params.delete("search");
        }
        lastSyncedSearchRef.current = trimmedSearch;
        router.replace(`/admin/book-requests?${params.toString()}`, {
          scroll: false,
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, searchParamsHook, router]);

  const searchQuery = localSearch.trim();
  const hasDisplayFilters = Boolean(searchQuery || currentStatus !== "all");

  // One universe RQ — client-filter table/KPIs (no second filtered fetch).
  const [ssrTimestamp] = useState(() => Date.now());
  const {
    data: universeRequestsData,
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsErrorData,
  } = useBorrowRequests(
    ADMIN_BORROW_REQUESTS_UNFILTERED,
    initialRequests,
    initialRequests && initialRequests.length > 0 ? ssrTimestamp : undefined,
  );
  const universeRequests: BorrowRecordWithDetails[] = React.useMemo(
    () =>
      (universeRequestsData ?? initialRequests ?? []) as BorrowRecordWithDetails[],
    [universeRequestsData, initialRequests],
  );

  const requests: BorrowRecordWithDetails[] = React.useMemo(() => {
    const base =
      universeRequests.length > 0
        ? universeRequests
        : (initialRequests ?? []);
    if (!hasDisplayFilters) return base;
    const q = searchQuery.toLowerCase();
    return base.filter((r) => {
      if (currentStatus !== "all" && r.status !== currentStatus) return false;
      if (!q) return true;
      return (
        (r.bookTitle ?? "").toLowerCase().includes(q) ||
        (r.bookAuthor ?? "").toLowerCase().includes(q) ||
        (r.userName ?? "").toLowerCase().includes(q) ||
        (r.userEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [
    universeRequests,
    initialRequests,
    hasDisplayFilters,
    searchQuery,
    currentStatus,
  ]);

  const updateSearchParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParamsHook.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
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

  const pendingCount = universeRequests.filter(
    (r) => r.status === "PENDING",
  ).length;
  const borrowedCount = universeRequests.filter(
    (r) => r.status === "BORROWED",
  ).length;
  const returnedCount = universeRequests.filter(
    (r) => r.status === "RETURNED",
  ).length;
  const cancelledCount = universeRequests.filter(
    (r) => r.status === "CANCELLED",
  ).length;

  const columns = useMemo<ColumnDef<BorrowRecordWithDetails>[]>(
    () => [
      {
        id: "book",
        accessorKey: "bookTitle",
        size: 280,
        minSize: 200,
        header: ({ column }) => (
          <SortableHeader column={column}>Book</SortableHeader>
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <AdminBookIdentityCell
              bookId={r.bookId}
              title={r.bookTitle}
              author={r.bookAuthor}
              coverUrl={r.bookCoverUrl}
              coverColor={r.bookCoverColor}
              genre={r.bookGenre}
              rating={r.bookRating}
            />
          );
        },
      },
      {
        id: "borrower",
        accessorKey: "userName",
        size: 220,
        minSize: 160,
        header: ({ column }) => (
          <SortableHeader column={column}>Borrower</SortableHeader>
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <PersonAttribution
              person={{
                id: r.userId,
                fullName: r.userName,
                email: r.userEmail,
                universityCard: r.userUniversityCard ?? null,
              }}
              href={`/admin/users/${r.userId}`}
              variant="light"
            />
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        size: 220,
        minSize: 180,
        header: ({ column }) => (
          <SortableHeader column={column}>Status</SortableHeader>
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex min-w-0 flex-col items-start gap-0.5 overflow-hidden">
              <BorrowStatusBadge status={r.status} />
              <BorrowLifecycleDates
                status={r.status}
                createdAt={r.createdAt}
                borrowDate={r.borrowDate}
                updatedAt={r.updatedAt}
                dueDate={r.dueDate}
                returnDate={r.returnDate}
              />
            </div>
          );
        },
      },
      {
        id: "actions",
        size: 64,
        minSize: 56,
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <BorrowRowActions
            request={row.original}
            currentAdmin={currentAdmin}
          />
        ),
      },
    ],
    [currentAdmin],
  );

  if (requestsError && requests.length === 0) {
    return (
      <section className="admin-panel">
        <div className="py-6 text-center sm:py-8">
          <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
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
    <AdminPageShell
      header={
        <AdminPageHeader
          title="Borrow Queue"
          description="Approve, reject, and return borrow requests"
          icon={Bookmark}
        />
      }
      kpis={
        <StatCardGrid>
          <StatCard
            title="In queue"
            value={universeRequests.length}
            icon={BookOpen}
            hue="blue"
          />
          <StatCard
            title="Awaiting approval"
            value={pendingCount}
            icon={Hourglass}
            hue="amber"
          />
          <StatCard
            title="On loan"
            value={borrowedCount}
            icon={CheckCircle}
            hue="violet"
          />
          <StatCard
            title="Returned"
            value={returnedCount}
            icon={RotateCcw}
            hue="emerald"
          />
          <StatCard
            title="Soft-cancelled"
            value={cancelledCount}
            icon={XCircle}
            hue="rose"
          />
        </StatCardGrid>
      }
    >
      <section className="admin-panel">
        {successMessage ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
            <h3 className="text-sm font-medium text-green-800">
              {successMessage === "approved" &&
                "Borrow request approved successfully."}
              {successMessage === "rejected" &&
                "Borrow request rejected successfully."}
              {successMessage === "returned" && "Book returned successfully."}
            </h3>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
            <h3 className="text-sm font-medium text-red-800">
              Operation failed
            </h3>
          </div>
        ) : null}

        <AdminListToolbar
          title="Borrow Queue"
          count={requests.length}
          chips={
            <DismissibleFilterChips
              variant="light"
              groups={
                currentStatus !== "all"
                  ? [
                      {
                        label: "Status",
                        values: [currentStatus],
                        onClear: () => handleFilterChange("status", "all"),
                        renderBadge: (value: string) => {
                          const opt = borrowStatusFilterOptions().find(
                            (o) => o.value === value,
                          );
                          return (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                              {opt?.label ?? value}
                            </span>
                          );
                        },
                      },
                    ]
                  : []
              }
              onReset={clearFilters}
            />
          }
        >
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search book, author, user…"
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
            options={borrowStatusFilterOptions()}
          />
        </AdminListToolbar>

        <DataTable
          columns={columns}
          data={requests}
          isLoading={requestsLoading && requests.length === 0}
          emptyMessage={
            <AdminFilterEmptyState
              entityLabel="borrow requests"
              filtered={hasDisplayFilters}
              onClear={clearFilters}
              blankMessage="No borrow requests found."
              className="py-4 sm:py-6"
            />
          }
          initialPageSize={10}
        />
      </section>
    </AdminPageShell>
  );
};

export default AdminBookRequestsList;
