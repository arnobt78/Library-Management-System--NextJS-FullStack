"use client";

/**
 * ActivityLogSection — admin Activity History table (KPI row + period/search
 * toolbar + sortable TanStack table).
 * Columns: When (date/time stack), Actor (PersonAttribution), Action badge,
 * Entity (sky link or tooltip when unavailable), Details (full wrap text-xs).
 * Parent: CR-0003 / REQ-0034
 */

import { useMemo, useState } from "react";
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
import PersonAttribution from "@/components/PersonAttribution";
import PrefetchLink from "@/components/PrefetchLink";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminFilterEmptyState } from "@/components/admin/AdminFilterEmptyState";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { TABLE_CELL_STATIC, TABLE_CELL_TITLE } from "@/lib/ui/tableCellStyles";
import {
  activityEntityHref,
  activityEntityUnavailableReason,
  formatActivityDetails,
  formatActivityEntityLabel,
  isActivityEntityLinkable,
} from "@/lib/ui/activityLogDisplay";
import { cn } from "@/lib/utils";
import { periodFilterOptions } from "@/lib/ui/periodFilterOptions";

const PERIOD_OPTIONS = periodFilterOptions("light");

export default function ActivityLogSection({
  initialLogs,
}: {
  initialLogs: ActivityLogItem[];
}) {
  const [period, setPeriod] = useState<ActivityLogFilters["period"]>("7days");
  const [search, setSearch] = useState("");

  // Period drives the server fetch; search filters the loaded rows locally so
  // typing matches from the first character (no RQ refetch per keystroke).
  const filters = useMemo<ActivityLogFilters>(() => ({ period }), [period]);
  const { data: periodLogs = [], isPending } = useActivityLogs(
    filters,
    initialLogs,
  );

  const logs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return periodLogs;
    return periodLogs.filter((log) => {
      const hay = [
        log.actorName ?? "",
        log.actorEmail ?? "",
        log.action,
        log.entityType,
        log.entityId ?? "",
        formatActivityDetails(log.details),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [periodLogs, search]);

  const stats = useMemo(() => {
    let created = 0;
    let updated = 0;
    let deleted = 0;
    // KPIs stay on the full period universe (not the search-filtered rows)
    for (const log of periodLogs) {
      if (log.action === "CREATE") created += 1;
      else if (log.action === "UPDATE") updated += 1;
      else if (log.action === "DELETE") deleted += 1;
    }
    return { total: periodLogs.length, created, updated, deleted };
  }, [periodLogs]);

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

  const hasDisplayFilters = Boolean(search.trim() || period !== "7days");

  const columns = useMemo<ColumnDef<ActivityLogItem>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <SortableHeader column={column}>When</SortableHeader>
        ),
        cell: ({ row }) => {
          const at = new Date(row.original.createdAt);
          return (
            <div className="flex flex-col whitespace-nowrap leading-tight">
              <span className="text-sm text-gray-700">
                {at.toLocaleDateString("en-US", { dateStyle: "medium" })}
              </span>
              <span className="text-xs text-gray-500">
                {at.toLocaleTimeString("en-US", { timeStyle: "short" })}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "actorName",
        header: ({ column }) => (
          <SortableHeader column={column}>Actor</SortableHeader>
        ),
        cell: ({ row }) => {
          const { actorId, actorName, actorEmail, actorUniversityCard } =
            row.original;
          if (!actorId) {
            return (
              <PersonAttribution
                layout="stack"
                size={36}
                emptyLabel="System"
                person={null}
              />
            );
          }
          return (
            <div className="min-w-0 max-w-56">
              <PersonAttribution
                layout="stack"
                size={36}
                href={`/admin/users/${actorId}`}
                person={{
                  id: actorId,
                  fullName: actorName ?? "Admin",
                  email: actorEmail ?? "",
                  universityCard: actorUniversityCard,
                }}
              />
            </div>
          );
        },
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
        header: ({ column }) => (
          <SortableHeader column={column}>Entity</SortableHeader>
        ),
        cell: ({ row }) => {
          const { action, entityType, entityId, details } = row.original;
          const label = formatActivityEntityLabel(entityType);
          const linkable = isActivityEntityLinkable({
            action,
            entityType,
            entityId,
            details,
          });
          const href = activityEntityHref(entityType, entityId, details);

          if (linkable && href) {
            return (
              <PrefetchLink
                href={href}
                prefetch={false}
                className={cn(TABLE_CELL_TITLE, SKY_LINK_LIGHT)}
              >
                {label}
              </PrefetchLink>
            );
          }

          const reason = activityEntityUnavailableReason({
            action,
            entityType,
            entityId,
            details,
          });

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    TABLE_CELL_STATIC,
                    "cursor-default underline decoration-dotted decoration-gray-300 underline-offset-2",
                  )}
                >
                  {label}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {reason}
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        id: "details",
        header: "Details",
        cell: ({ row }) => (
          <span className="block min-w-32 max-w-md whitespace-pre-wrap break-words text-xs text-gray-600">
            {formatActivityDetails(row.original.details)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <AdminPageShell
      header={
        <AdminPageHeader
          title="Activity History"
          description="Recent admin actions across the system"
          icon={History}
        />
      }
      kpis={
        <StatCardGrid>
          <StatCard
            title="Total Activity"
            value={stats.total}
            icon={History}
            hue="blue"
          />
          <StatCard
            title="Created"
            value={stats.created}
            icon={FilePlus}
            hue="emerald"
          />
          <StatCard
            title="Updated"
            value={stats.updated}
            icon={FilePen}
            hue="amber"
          />
          <StatCard
            title="Deleted"
            value={stats.deleted}
            icon={Trash2}
            hue="rose"
          />
        </StatCardGrid>
      }
    >
      <div className="admin-panel">
        <AdminListToolbar
          title="Admin Activity History"
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
            placeholder="Search actor, action…"
            debounceMs={0}
            className="sm:min-w-64"
          />
          <FilterSelect
            label="Period"
            variant="light"
            labelLayout="embedded"
            className="sm:min-w-[170px]"
            value={period}
            onValueChange={(value) =>
              setPeriod(value as ActivityLogFilters["period"])
            }
            options={PERIOD_OPTIONS}
          />
        </AdminListToolbar>

        <TooltipProvider delayDuration={200}>
          <DataTable
            columns={columns}
            data={logs}
            isLoading={isPending && logs.length === 0}
            emptyMessage={
              <AdminFilterEmptyState
                entityLabel="activity"
                filtered={hasDisplayFilters}
                onClear={handleResetFilters}
                blankMessage="No activity recorded for this period."
                className="py-4 sm:py-6"
              />
            }
            initialPageSize={10}
          />
        </TooltipProvider>
      </div>
    </AdminPageShell>
  );
}
