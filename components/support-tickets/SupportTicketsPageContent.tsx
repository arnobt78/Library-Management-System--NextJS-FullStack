"use client";

/**
 * Personal "My Support Tickets" — dark glass layout matching my-profile /
 * api-docs. Densified subject+description, Created/Updated, Actions kebab;
 * New Ticket lives in the glass toolbar.
 * Parent: CR-0003 / REQ-0034 — list densify UI
 */

import { useMemo, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, CircleDot, Loader2, Plus, Ticket } from "lucide-react";
import { useUserSupportTickets } from "@/hooks/useQueries";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/filter-select";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import GlassSectionHeader from "@/components/GlassSectionHeader";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/lib/ui/semanticBadges";
import PersonAttribution from "@/components/PersonAttribution";
import { AllAdminLabel } from "@/components/support-tickets/AllAdminLabel";
import type {
  TicketPriority,
  TicketStatus,
} from "@/lib/validations/supportTicket";
import {
  ticketPriorityFilterOptions,
  ticketStatusFilterOptions,
} from "@/lib/ui/ticketOptions";
import { computeTicketListStats } from "@/lib/ui/ticketStats";
import SupportTicketDialog from "@/components/support-tickets/SupportTicketDialog";
import { TicketSubjectCell } from "@/components/support-tickets/TicketSubjectCell";
import { SupportTicketRowActions } from "@/components/support-tickets/SupportTicketRowActions";

const STATUS_FILTER_OPTIONS = ticketStatusFilterOptions("dark");
const PRIORITY_FILTER_OPTIONS = ticketPriorityFilterOptions("dark");

/** List glass shell — same CARD_PAD as detail (p-2 sm:p-4) */
const GLASS_PANEL =
  "surface-card rounded-xl border border-white/10 bg-dark-300/60 shadow-[0_12px_28px_rgba(0,0,0,0.25)] backdrop-blur-sm";

const SORTABLE_DARK = "text-light-200 hover:bg-white/10 hover:text-light-100";

export default function SupportTicketsPageContent({
  currentUserId,
  initialTickets,
}: {
  currentUserId: string;
  initialTickets: SupportTicketListItem[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  // Always fetch the user's full ticket set — filters are client-side so KPIs
  // stay on the unfiltered totals.
  const { data: allTickets = [], isPending } = useUserSupportTickets(
    currentUserId,
    {},
    initialTickets,
  );

  const tickets = useMemo(() => {
    return allTickets.filter((ticket) => {
      if (status !== "all" && ticket.status !== status) return false;
      if (priority !== "all" && ticket.priority !== priority) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          ticket.subject.toLowerCase().includes(q) ||
          ticket.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allTickets, status, priority, search]);

  const stats = useMemo(() => {
    const computed = computeTicketListStats(allTickets);
    return {
      total: computed.total,
      open: computed.open,
      inProgress: computed.inProgress,
      resolved: computed.resolved + computed.closed,
    };
  }, [allTickets]);

  const filterChipGroups = useMemo(() => {
    const groups: {
      label: string;
      values: string[];
      onClear: () => void;
      renderBadge: (value: string) => ReactNode;
    }[] = [];
    if (status !== "all") {
      groups.push({
        label: "Status",
        values: [status],
        onClear: () => setStatus("all"),
        renderBadge: (value: string) => (
          <TicketStatusBadge status={value as TicketStatus} variant="dark" />
        ),
      });
    }
    if (priority !== "all") {
      groups.push({
        label: "Priority",
        values: [priority],
        onClear: () => setPriority("all"),
        renderBadge: (value: string) => (
          <TicketPriorityBadge
            priority={value as TicketPriority}
            variant="dark"
          />
        ),
      });
    }
    return groups;
  }, [status, priority]);

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setPriority("all");
  };

  const kpiItems = useMemo(
    () => [
      {
        key: "total",
        title: "Total",
        hint: "All tickets you've submitted",
        value: stats.total,
        icon: <Ticket className="size-4" />,
        tone: "from-slate-500/25 via-slate-500/10 to-slate-500/5 border-slate-400/30 text-slate-100 shadow-[0_10px_30px_rgba(148,163,184,0.15)]",
      },
      {
        key: "open",
        title: "Open",
        hint: "Awaiting support response",
        value: stats.open,
        icon: <CircleDot className="size-4" />,
        tone: "from-rose-500/25 via-rose-500/10 to-rose-500/5 border-rose-400/30 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.2)]",
      },
      {
        key: "inProgress",
        title: "In Progress",
        hint: "Being worked by the team",
        value: stats.inProgress,
        icon: <Loader2 className="size-4" />,
        tone: "from-amber-500/25 via-amber-500/10 to-amber-500/5 border-amber-400/30 text-amber-100 shadow-[0_10px_30px_rgba(245,158,11,0.2)]",
      },
      {
        key: "resolved",
        title: "Resolved/Closed",
        hint: "Finished or archived tickets",
        value: stats.resolved,
        icon: <CheckCircle2 className="size-4" />,
        tone: "from-emerald-500/25 via-emerald-500/10 to-emerald-500/5 border-emerald-400/30 text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.2)]",
      },
    ],
    [stats],
  );

  // Densify: dates under subject; no Replies/Date cols (14" fit); assignee stack
  const columns = useMemo<ColumnDef<SupportTicketListItem>[]>(
    () => [
      {
        accessorKey: "subject",
        size: 300,
        minSize: 220,
        header: ({ column }) => (
          <SortableHeader column={column} className={SORTABLE_DARK}>
            Subject & Description
          </SortableHeader>
        ),
        cell: ({ row }) => (
          <TicketSubjectCell
            variant="dark"
            href={`/support-tickets/${row.original.id}`}
            subject={row.original.subject}
            description={row.original.description}
            createdAt={row.original.createdAt}
            updatedAt={row.original.updatedAt}
            showDates
          />
        ),
      },
      {
        accessorKey: "status",
        size: 118,
        minSize: 110,
        header: "Status",
        cell: ({ row }) => (
          <div className="inline-flex">
            <TicketStatusBadge status={row.original.status} variant="dark" />
          </div>
        ),
      },
      {
        accessorKey: "priority",
        size: 100,
        minSize: 90,
        header: "Priority",
        cell: ({ row }) => (
          <div className="inline-flex">
            <TicketPriorityBadge
              priority={row.original.priority}
              variant="dark"
            />
          </div>
        ),
      },
      {
        accessorKey: "assignedToName",
        size: 170,
        minSize: 140,
        header: "Assigned To",
        cell: ({ row }) => {
          const t = row.original;
          if (!t.assignedToId || !t.assignedToName) {
            return <AllAdminLabel variant="dark" />;
          }
          return (
            <PersonAttribution
              layout="stack"
              variant="dark"
              size={36}
              person={{
                id: t.assignedToId,
                fullName: t.assignedToName,
                email: t.assignedToEmail ?? "",
                universityCard: t.assignedToUniversityCard,
              }}
            />
          );
        },
      },
      {
        accessorKey: "replyCount",
        size: 72,
        minSize: 64,
        header: "Replies",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-light-200/80">
            {row.original.replyCount}
          </span>
        ),
      },
      {
        id: "actions",
        size: 64,
        minSize: 56,
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <SupportTicketRowActions
            surface="user"
            variant="dark"
            ticket={row.original}
            detailHref={`/support-tickets/${row.original.id}`}
          />
        ),
      },
    ],
    [],
  );

  return (
    <section className="stack-section space-y-4 sm:space-y-6">
      {/*
        New Ticket via GlassSectionHeader `trailing` — profile-action-btn is
        `position: relative` (@apply), so absolute overlays never stuck inside
        the header card (button fell into flow under the title).
      */}
      <GlassSectionHeader
        as="h1"
        icon={<Ticket className="size-5 text-primary" />}
        title="My Support Tickets"
        subtitle="Track your questions and requests to the library support team."
        trailing={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="profile-action-btn profile-action-btn--submit inline-flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            New Ticket
          </button>
        }
      />

      <section className="profile-stats-panel">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-4">
          {kpiItems.map((item) => (
            <div key={item.key} className={`profile-kpi-card ${item.tone}`}>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 opacity-90">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-tight sm:text-sm">
                    {item.title}
                  </p>
                  <p className="text-[10px] leading-snug opacity-75 sm:text-xs">
                    {item.hint}
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-lg font-medium tabular-nums sm:text-xl">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className={GLASS_PANEL}>
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-medium text-light-100 sm:text-lg">
            Tickets ({tickets.length})
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <SearchInput
              variant="dark"
              value={search}
              onChange={setSearch}
              placeholder="Search your tickets…"
              debounceMs={0}
              className="sm:min-w-[200px]"
            />
            <FilterSelect
              label="Status"
              variant="dark"
              labelLayout="inline"
              value={status}
              onValueChange={setStatus}
              options={STATUS_FILTER_OPTIONS}
              className="sm:min-w-[160px]"
            />
            <FilterSelect
              label="Priority"
              variant="dark"
              labelLayout="inline"
              value={priority}
              onValueChange={setPriority}
              options={PRIORITY_FILTER_OPTIONS}
              className="sm:min-w-[160px]"
            />
          </div>
        </div>

        <DismissibleFilterChips
          variant="dark"
          groups={filterChipGroups}
          onReset={handleResetFilters}
        />

        {/*
          No onRowClick — subject cell + Actions "View Details" navigate.
          Row click ghost-fires after kebab Edit closes the menu (portaled
          pointerup lands on the <tr>) and wrongly opened ticket detail.
        */}
        <DataTable
          variant="dark"
          columns={columns}
          data={tickets}
          isLoading={isPending && tickets.length === 0}
          emptyMessage="You haven't submitted any support tickets yet."
          initialPageSize={10}
        />
      </div>

      <SupportTicketDialog
        mode="create"
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </section>
  );
}
