/**
 * Insights overdue ops table — Borrow Queue DNA (book + person) + severity filters.
 * PrefetchLinks to book / User 360 / borrow request detail.
 */
"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { OverdueBook } from "@/lib/services/analytics";
import { DataTable } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/filter-select";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { AdminFilterEmptyState } from "@/components/admin/AdminFilterEmptyState";
import { AdminBookIdentityCell } from "@/components/admin/AdminBookIdentityCell";
import PersonAttribution from "@/components/PersonAttribution";
import PrefetchLink from "@/components/PrefetchLink";
import UniversityIdMeta from "@/components/UniversityIdMeta";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import { ADMIN_PANEL_CLASS } from "@/lib/ui/adminSurfaceStyles";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import {
  matchesOverdueDaysPeriod,
  overdueSeverityPeriodOptions,
  type ListPeriod,
} from "@/lib/ui/periodFilterOptions";
import { cn } from "@/lib/utils";

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
                hideUpdated
              />
              {r.borrowDate ? (
                <TicketDateMeta
                  createdAt={r.borrowDate}
                  createdLabel="Borrowed"
                  hideUpdated
                />
              ) : null}
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
    accessorFn: (r) => Number(r.fineAmount) || 0,
    size: 100,
    cell: ({ row }) => {
      const fine = row.original.fineAmount;
      const amount = Number(fine);
      if (!fine || !Number.isFinite(amount) || amount <= 0) {
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
    id: "request",
    header: "Request",
    accessorKey: "recordId",
    size: 80,
    cell: ({ row }) => (
      <PrefetchLink
        href={`/admin/book-requests/${row.original.recordId}`}
        prefetchKind="borrow-request-detail"
        className={cn(SKY_LINK_LIGHT, "text-sm font-medium")}
      >
        View
      </PrefetchLink>
    ),
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
