"use client";

/**
 * ActivityLogSection — admin Activity History table (KPI row + period/search
 * toolbar + sortable TanStack table). Parent: CR-0003 / REQ-0034
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { FilePen, FilePlus, History, Trash2 } from "lucide-react";
import { useActivityLogs } from "@/hooks/useQueries";
import type {
  ActivityLogFilters,
  ActivityLogItem,
} from "@/lib/services/activityLogs";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/filter-select";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import { AuditActionBadge } from "@/lib/ui/semanticBadges";
import { PersonNameEmailCell } from "@/components/ui/PersonNameEmailCell";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import {
  TABLE_CELL_STATIC,
  TABLE_CELL_TITLE,
} from "@/lib/ui/tableCellStyles";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 days" },
  { value: "30days", label: "Last 30 days" },
  { value: "all", label: "All (latest 50)" },
];

/** Books/users use their existing pages as the "detail" surface (no dedicated route). */
const ENTITY_DETAIL_ROUTE: Record<string, (id: string) => string> = {
  book: (id) => `/admin/books/${id}/edit`,
  user: (id) => `/admin/users/${id}`,
  ticket: (id) => `/admin/support-tickets/${id}`,
  review: (id) => `/admin/book-reviews/${id}`,
};

function formatEntityLabel(entityType: string): string {
  return entityType.charAt(0).toUpperCase() + entityType.slice(1).replace(/-/g, " ");
}

function summarizeDetails(details: Record<string, unknown> | null): string {
  if (!details) return "—";
  const preferred =
    details.title ?? details.name ?? details.subject ?? details.email ?? details.status;
  if (typeof preferred === "string") return preferred;
  const keys = Object.keys(details);
  return keys.length > 0 ? `${keys.length} field${keys.length > 1 ? "s" : ""} changed` : "—";
}

export default function ActivityLogSection({
  initialLogs,
}: {
  initialLogs: ActivityLogItem[];
}) {
  const [period, setPeriod] = useState<ActivityLogFilters["period"]>("7days");
  const [search, setSearch] = useState("");

  const filters = useMemo<ActivityLogFilters>(
    () => ({ period, search: search || undefined }),
    [period, search],
  );
  const { data: logs = [], isPending } = useActivityLogs(filters, initialLogs);

  const stats = useMemo(() => {
    let created = 0;
    let updated = 0;
    let deleted = 0;
    for (const log of logs) {
      if (log.action === "CREATE") created += 1;
      else if (log.action === "UPDATE") updated += 1;
      else if (log.action === "DELETE") deleted += 1;
    }
    return { total: logs.length, created, updated, deleted };
  }, [logs]);

  const filterChipGroups = useMemo(() => {
    if (period === "7days") return [];
    const label =
      PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
    return [
      {
        label: "Period",
        values: [period],
        onClear: () => setPeriod("7days"),
        renderBadge: () => (
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
            {label}
          </span>
        ),
      },
    ];
  }, [period]);

  const handleResetFilters = () => {
    setSearch("");
    setPeriod("7days");
  };

  const columns = useMemo<ColumnDef<ActivityLogItem>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column}>When</SortableHeader>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-600">
            {new Date(row.original.createdAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        ),
      },
      {
        accessorKey: "actorName",
        header: ({ column }) => <SortableHeader column={column}>Actor</SortableHeader>,
        cell: ({ row }) => (
          <PersonNameEmailCell
            name={row.original.actorName ?? "System"}
            email={row.original.actorEmail}
          />
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => (
          <AuditActionBadge
            action={row.original.action as "CREATE" | "UPDATE" | "DELETE"}
          />
        ),
      },
      {
        accessorKey: "entityType",
        header: ({ column }) => <SortableHeader column={column}>Entity</SortableHeader>,
        cell: ({ row }) => {
          const { entityType, entityId } = row.original;
          const label = formatEntityLabel(entityType);
          const href = entityId ? ENTITY_DETAIL_ROUTE[entityType]?.(entityId) : undefined;
          return href ? (
            <Link
              href={href}
              prefetch={false}
              className={cn(TABLE_CELL_TITLE, SKY_LINK_LIGHT)}
            >
              {label}
            </Link>
          ) : (
            <span className={TABLE_CELL_STATIC}>{label}</span>
          );
        },
      },
      {
        id: "details",
        header: "Details",
        cell: ({ row }) => (
          <span className="block max-w-xs truncate text-sm text-gray-500">
            {summarizeDetails(row.original.details)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <section className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title="Activity History"
        description="Recent admin actions across the library"
        icon={History}
      />
      <StatCardGrid>
        <StatCard title="Total Activity" value={stats.total} icon={History} hue="blue" />
        <StatCard title="Created" value={stats.created} icon={FilePlus} hue="emerald" />
        <StatCard title="Updated" value={stats.updated} icon={FilePen} hue="amber" />
        <StatCard title="Deleted" value={stats.deleted} icon={Trash2} hue="rose" />
      </StatCardGrid>

      <div className="admin-panel">
        <AdminListToolbar
          title="Activity History"
          count={logs.length}
          chips={
            <DismissibleFilterChips
              variant="light"
              groups={filterChipGroups}
              onReset={handleResetFilters}
            />
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by actor, action, entity…"
            className="sm:min-w-[250px]"
          />
          <FilterSelect
            label="Period"
            variant="light"
            labelLayout="inline"
            className="sm:min-w-[190px]"
            value={period}
            onValueChange={(value) => setPeriod(value as ActivityLogFilters["period"])}
            options={PERIOD_OPTIONS}
          />
        </AdminListToolbar>

        <DataTable
          columns={columns}
          data={logs}
          isLoading={isPending && logs.length === 0}
          emptyMessage="No activity recorded for this period."
          initialPageSize={10}
        />
      </div>
    </section>
  );
}
