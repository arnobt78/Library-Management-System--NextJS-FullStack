/**
 * Ticket detail KPI row — Status/Priority badges + Messages + Assigned.
 * Equal-height cards via shared DetailKpiShell.
 * Parent: CR-0003 / REQ-0034
 */
"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  CircleDot,
  MessageSquare,
  UsersRound,
} from "lucide-react";
import { DetailKpiShell } from "@/components/admin/DetailKpiShell";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/lib/ui/semanticBadges";
import type {
  TicketPriority,
  TicketStatus,
} from "@/lib/validations/supportTicket";
import { cn } from "@/lib/utils";

export function TicketDetailKpiGrid({
  status,
  priority,
  messageCount,
  replyCount,
  assignedSlot,
  variant = "light",
  statusHint,
  priorityHint,
  assignedHint,
  messageBreakdown,
}: {
  status: TicketStatus;
  priority: TicketPriority;
  messageCount: number;
  replyCount: number;
  assignedSlot: ReactNode;
  variant?: "light" | "dark";
  statusHint?: string;
  priorityHint?: string;
  assignedHint?: string;
  messageBreakdown?: string;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <DetailKpiShell
        variant={variant}
        icon={<CircleDot className="size-4" />}
        label="Status"
        hint={statusHint ?? "Current ticket status"}
      >
        <TicketStatusBadge status={status} variant={variant} />
      </DetailKpiShell>
      <DetailKpiShell
        variant={variant}
        icon={<AlertTriangle className="size-4" />}
        label="Priority"
        hint={priorityHint ?? "Urgency for support triage"}
      >
        <TicketPriorityBadge priority={priority} variant={variant} />
      </DetailKpiShell>
      <DetailKpiShell
        variant={variant}
        icon={<MessageSquare className="size-4" />}
        label="Messages"
        hint={
          messageBreakdown ??
          `Description + ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
        }
      >
        <p
          className={cn(
            "text-2xl font-medium tabular-nums tracking-tight",
            variant === "dark" ? "text-light-100" : "text-dark-400",
          )}
        >
          {messageCount}
        </p>
      </DetailKpiShell>
      <DetailKpiShell
        variant={variant}
        icon={<UsersRound className="size-4" />}
        label="Assigned To"
        hint={assignedHint ?? "Who handles this ticket"}
      >
        <div className="min-w-0">{assignedSlot}</div>
      </DetailKpiShell>
    </div>
  );
}
