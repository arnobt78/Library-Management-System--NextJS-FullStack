"use client";

/**
 * Admin Support Tickets — densified moderation queue.
 * Subject embeds Created/Updated (no Date/Replies cols — 14" fit).
 * Requester/Assignee = PersonAttribution stack (avatar + name/email + copy).
 * Null assignee renders as "All admin".
 * Parent: CR-0003 / REQ-0034 — list densify UI
 */

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Loader2,
  Ticket,
} from "lucide-react";
import { useAdminSupportTickets } from "@/hooks/useQueries";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/lib/ui/semanticBadges";
import {
  ticketPriorityMultiOptions,
  ticketStatusMultiOptions,
} from "@/lib/ui/ticketOptions";
import { computeTicketListStats } from "@/lib/ui/ticketStats";
import PersonAttribution from "@/components/PersonAttribution";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { TicketSubjectCell } from "@/components/support-tickets/TicketSubjectCell";
import { AllAdminLabel } from "@/components/support-tickets/AllAdminLabel";
import { SupportTicketRowActions } from "@/components/support-tickets/SupportTicketRowActions";
import type { AssignableAdminOption } from "@/components/support-tickets/SupportTicketDialog";
import type { TicketPriority, TicketStatus } from "@/lib/validations/supportTicket";

export default function SupportTicketList({
  initialTickets,
  assignableAdmins = [],
}: {
  initialTickets: SupportTicketListItem[];
  assignableAdmins?: AssignableAdminOption[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);

  const { data: allTickets = [], isPending } = useAdminSupportTickets(
    {},
    initialTickets,
  );

  const tickets = useMemo(() => {
    return allTickets.filter((ticket) => {
      if (statusFilter.length > 0 && !statusFilter.includes(ticket.status)) {
        return false;
      }
      if (
        priorityFilter.length > 0 &&
        !priorityFilter.includes(ticket.priority)
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          ticket.subject.toLowerCase().includes(q) ||
          ticket.description.toLowerCase().includes(q) ||
          ticket.userName.toLowerCase().includes(q) ||
          ticket.userEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allTickets, statusFilter, priorityFilter, search]);

  const stats = useMemo(
    () => computeTicketListStats(allTickets),
    [allTickets],
  );

  const filterChipGroups = useMemo(
    () => [
      {
        label: "Status",
        values: statusFilter,
        onClear: () => setStatusFilter([]),
        renderBadge: (value: string) => (
          <TicketStatusBadge status={value as TicketStatus} />
        ),
      },
      {
        label: "Priority",
        values: priorityFilter,
        onClear: () => setPriorityFilter([]),
        renderBadge: (value: string) => (
          <TicketPriorityBadge priority={value as TicketPriority} />
        ),
      },
    ],
    [statusFilter, priorityFilter],
  );

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter([]);
    setPriorityFilter([]);
  };

  const columns = useMemo<ColumnDef<SupportTicketListItem>[]>(
    () => [
      {
        accessorKey: "subject",
        size: 280,
        minSize: 200,
        header: ({ column }) => (
          <SortableHeader column={column}>Subject & Description</SortableHeader>
        ),
        cell: ({ row }) => (
          <TicketSubjectCell
            variant="light"
            href={`/admin/support-tickets/${row.original.id}`}
            subject={row.original.subject}
            description={row.original.description}
            createdAt={row.original.createdAt}
            updatedAt={row.original.updatedAt}
            showDates
          />
        ),
      },
      {
        accessorKey: "userName",
        size: 170,
        minSize: 140,
        header: ({ column }) => (
          <SortableHeader column={column}>Requester</SortableHeader>
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <PersonAttribution
              layout="stack"
              size={36}
              href={`/admin/users/${row.original.userId}`}
              person={{
                id: row.original.userId,
                fullName: row.original.userName,
                email: row.original.userEmail,
                universityCard: row.original.userUniversityCard,
              }}
            />
          </div>
        ),
      },
      {
        accessorKey: "status",
        size: 118,
        minSize: 110,
        header: "Status",
        cell: ({ row }) => (
          <div className="inline-flex">
            <TicketStatusBadge status={row.original.status} />
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
            <TicketPriorityBadge priority={row.original.priority} />
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
            return <AllAdminLabel />;
          }
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <PersonAttribution
                layout="stack"
                size={36}
                href={`/admin/users/${t.assignedToId}`}
                person={{
                  id: t.assignedToId,
                  fullName: t.assignedToName,
                  email: t.assignedToEmail ?? "",
                  universityCard: t.assignedToUniversityCard,
                }}
              />
            </div>
          );
        },
      },
      {
        // Number only (no MessageSquare icon) — matches user table density
        accessorKey: "replyCount",
        size: 72,
        minSize: 64,
        header: "Replies",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-gray-600">
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
            surface="admin"
            variant="light"
            ticket={row.original}
            detailHref={`/admin/support-tickets/${row.original.id}`}
            assignableAdmins={assignableAdmins}
          />
        ),
      },
    ],
    [assignableAdmins],
  );

  return (
    <section className="space-y-4 sm:space-y-6">
      <StatCardGrid>
        <StatCard title="Total Tickets" value={stats.total} icon={Ticket} hue="blue" />
        <StatCard title="Open" value={stats.open} icon={CircleDot} hue="rose" />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={Loader2}
          hue="amber"
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle2}
          hue="emerald"
        />
        <StatCard
          title="Urgent Open"
          value={stats.urgentOpen}
          icon={AlertTriangle}
          hue="violet"
        />
      </StatCardGrid>

      <div className="admin-panel">
        <AdminListToolbar
          title="Support Tickets"
          count={tickets.length}
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
            placeholder="Search subject, requester…"
            className="sm:min-w-[220px]"
          />
          <MultiSelectFilter
            label="Status"
            options={ticketStatusMultiOptions("light")}
            selected={statusFilter}
            onChange={setStatusFilter}
            className="sm:min-w-[150px]"
          />
          <MultiSelectFilter
            label="Priority"
            options={ticketPriorityMultiOptions("light")}
            selected={priorityFilter}
            onChange={setPriorityFilter}
            className="sm:min-w-[150px]"
          />
        </AdminListToolbar>

        {/*
          No onRowClick — subject link + Actions "View Details" navigate.
          Avoids ghost-click into detail when kebab Edit/Delete closes.
        */}
        <DataTable
          columns={columns}
          data={tickets}
          isLoading={isPending && tickets.length === 0}
          emptyMessage="No support tickets match your filters."
          initialPageSize={10}
        />
      </div>
    </section>
  );
}
