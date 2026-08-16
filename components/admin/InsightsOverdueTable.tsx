/**
 * Insights overdue ops table — DataTable + instant search/period filters.
 * PrefetchLinks to book / User 360 / borrow request detail.
 */
"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { OverdueBook } from "@/lib/services/analytics";
import { DataTable } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/filter-select";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { AdminFilterEmptyState } from "@/components/admin/AdminFilterEmptyState";
import PrefetchLink from "@/components/PrefetchLink";
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
    row.userName,
    row.userEmail,
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
    cell: ({ row }) => {
      const r = row.original;
      const title = (
        <span className="font-medium text-dark-400">{r.bookTitle}</span>
      );
      return (
        <div className="min-w-40 max-w-64">
          {r.bookId ? (
            <PrefetchLink
              href={`/books/${r.bookId}`}
              prefetchKind="book-detail"
              className={cn(SKY_LINK_LIGHT, "block truncate")}
            >
              {title}
            </PrefetchLink>
          ) : (
            <div className="truncate">{title}</div>
          )}
          <div className="truncate text-xs text-slate-500">{r.bookAuthor}</div>
        </div>
      );
    },
  },
  {
    id: "user",
    header: "User",
    accessorFn: (r) => r.userName,
    cell: ({ row }) => {
      const r = row.original;
      const name = (
        <span className="font-medium text-dark-400">{r.userName}</span>
      );
      return (
        <div className="min-w-40 max-w-56">
          {r.userId ? (
            <PrefetchLink
              href={`/admin/users/${r.userId}`}
              prefetchKind="admin-user-detail"
              className={cn(SKY_LINK_LIGHT, "block truncate")}
            >
              {name}
            </PrefetchLink>
          ) : (
            <div className="truncate">{name}</div>
          )}
          <div className="truncate text-xs text-slate-500">{r.userEmail}</div>
        </div>
      );
    },
  },
  {
    id: "daysOverdue",
    header: "Days overdue",
    accessorKey: "daysOverdue",
    cell: ({ row }) => (
      <span className="inline-flex rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs font-medium tabular-nums text-rose-700">
        {row.original.daysOverdue} days
      </span>
    ),
  },
  {
    id: "fine",
    header: "Fine",
    accessorFn: (r) => Number(r.fineAmount) || 0,
    cell: ({ row }) => {
      const fine = row.original.fineAmount;
      const amount = Number(fine);
      if (!fine || !Number.isFinite(amount) || amount <= 0) {
        return <span className="text-xs text-slate-500">No fine</span>;
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
    cell: ({ row }) => (
      <PrefetchLink
        href={`/admin/book-requests/${row.original.recordId}`}
        prefetchKind="borrow-request-detail"
        className={cn(SKY_LINK_LIGHT, "text-sm tabular-nums")}
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

  const hasFilters = Boolean(searchQuery || period !== "all");

  return (
    <div className={ADMIN_PANEL_CLASS}>
      <AdminListToolbar title="Overdue Books" count={filtered.length}>
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
            onClear={
              hasFilters
                ? () => {
                    setLocalSearch("");
                    setPeriod("all");
                  }
                : undefined
            }
            blankMessage="No overdue books — all loans are on time."
          />
        }
      />
    </div>
  );
}
