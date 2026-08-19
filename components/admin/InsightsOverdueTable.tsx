/**
 * Insights overdue ops table — Borrow Queue DNA (book + person) + severity filters.
 * Actions kebab: View Details only (read-only Insights surface).
 */
"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreVertical, X } from "lucide-react";
import type { OverdueBook } from "@/lib/services/analytics";
import { DataTable } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/filter-select";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { AdminFilterEmptyState } from "@/components/admin/AdminFilterEmptyState";
import { AdminBookIdentityCell } from "@/components/admin/AdminBookIdentityCell";
import PersonAttribution from "@/components/PersonAttribution";
import PrefetchLink from "@/components/PrefetchLink";
import UniversityIdMeta from "@/components/UniversityIdMeta";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import { ADMIN_PANEL_CLASS } from "@/lib/ui/adminSurfaceStyles";
import { LIGHT_MENU } from "@/lib/ui/glassActionChrome";
import {
  matchesOverdueDaysPeriod,
  overdueSeverityPeriodOptions,
  type ListPeriod,
} from "@/lib/ui/periodFilterOptions";

const PERIOD_OPTIONS = overdueSeverityPeriodOptions("light");

function matchesOverdueSearch(row: OverdueBook, q: string): boolean {
  if (!q) return true;
  const hay = [
    row.bookTitle,
    row.bookAuthor,
    row.bookGenre,
    row.userName,
    row.userEmail,
    row.userUniversityId != null ? String(row.userUniversityId) : "",
    row.recordId,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function OverdueRowActions({ recordId }: { recordId: string }) {
  const detailHref = `/admin/book-requests/${recordId}`;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Overdue request actions"
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
          <PrefetchLink
            href={detailHref}
            prefetchKind="borrow-request-detail"
            prefetch={false}
          >
            <Eye className="size-3.5" />
            View Details
          </PrefetchLink>
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

const columns: ColumnDef<OverdueBook>[] = [
  {
    id: "book",
    header: "Book",
    accessorFn: (r) => r.bookTitle,
    size: 280,
    minSize: 200,
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
          availableCopies={r.bookAvailableCopies}
          totalCopies={r.bookTotalCopies}
        />
      );
    },
  },
  {
    id: "user",
    header: "User",
    accessorFn: (r) => r.userName,
    size: 240,
    minSize: 180,
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
          meta={
            <div className="flex min-w-0 flex-col gap-0.5">
              <UniversityIdMeta
                universityId={r.userUniversityId}
                variant="light"
              />
              <TicketDateMeta
                createdAt={r.dueDate}
                createdLabel="Due"
                updatedAt={r.borrowDate}
                updatedLabel="Borrowed"
                hideUpdated={!r.borrowDate}
                independentUpdated
              />
            </div>
          }
        />
      );
    },
  },
  {
    id: "daysOverdue",
    header: "Days Overdue",
    accessorKey: "daysOverdue",
    size: 120,
    cell: ({ row }) => (
      <span className="inline-flex rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs font-medium tabular-nums text-rose-700">
        {row.original.daysOverdue} Days
      </span>
    ),
  },
  {
    id: "fine",
    header: "Fine",
    accessorFn: (r) => Number.parseFloat(String(r.fineAmount ?? "0")) || 0,
    size: 100,
    cell: ({ row }) => {
      const fine = row.original.fineAmount;
      const amount = Number.parseFloat(String(fine ?? "0"));
      if (!Number.isFinite(amount) || amount <= 0) {
        return <span className="text-xs text-slate-500">No Fine</span>;
      }
      return (
        <span className="text-sm font-medium tabular-nums text-rose-600">
          ${amount.toFixed(2)}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    accessorKey: "recordId",
    size: 64,
    minSize: 56,
    enableSorting: false,
    cell: ({ row }) => <OverdueRowActions recordId={row.original.recordId} />,
  },
];

export function InsightsOverdueTable({ rows }: { rows: OverdueBook[] }) {
  const [localSearch, setLocalSearch] = useState("");
  const [period, setPeriod] = useState<ListPeriod>("all");

  const searchQuery = localSearch.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          matchesOverdueSearch(r, searchQuery) &&
          matchesOverdueDaysPeriod(r.daysOverdue, period),
      ),
    [rows, searchQuery, period],
  );

  const clearFilters = () => {
    setLocalSearch("");
    setPeriod("all");
  };

  const hasFilters = Boolean(searchQuery || period !== "all");
  const periodLabel =
    PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;

  return (
    <div className={ADMIN_PANEL_CLASS}>
      <AdminListToolbar
        title="Overdue Books"
        count={filtered.length}
        chips={
          <DismissibleFilterChips
            variant="light"
            onReset={clearFilters}
            groups={[
              ...(searchQuery
                ? [
                    {
                      label: "Search",
                      values: [localSearch.trim()],
                      onClear: () => setLocalSearch(""),
                      renderBadge: (value: string) => (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {value}
                        </span>
                      ),
                    },
                  ]
                : []),
              ...(period !== "all"
                ? [
                    {
                      label: "Period",
                      values: [period],
                      onClear: () => setPeriod("all"),
                      renderBadge: () => (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {periodLabel}
                        </span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        }
      >
        <SearchInput
          value={localSearch}
          onChange={setLocalSearch}
          placeholder="Search book, author, user…"
          debounceMs={0}
          className="w-full sm:w-56"
        />
        <FilterSelect
          label="Period"
          variant="light"
          labelLayout="embedded"
          value={period}
          onValueChange={(v) => setPeriod(v as ListPeriod)}
          options={PERIOD_OPTIONS}
          className="w-full sm:w-44"
        />
      </AdminListToolbar>
      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage={
          <AdminFilterEmptyState
            entityLabel="overdue books"
            filtered={hasFilters}
            onClear={hasFilters ? clearFilters : undefined}
            blankMessage="No overdue books — all loans are on time."
          />
        }
      />
    </div>
  );
}
