/**
 * Ticket detail KPI row — Status/Priority badges + Messages + Assigned.
 * Equal-height cards: value mid-aligned, always-reserved hint footer.
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
import { CARD_PAD_CLASS } from "@/lib/ui/cardPadStyles";
import { TicketPriorityBadge, TicketStatusBadge } from "@/lib/ui/semanticBadges";
import type { TicketPriority, TicketStatus } from "@/lib/validations/supportTicket";
import { cn } from "@/lib/utils";

function KpiShell({
  variant,
  icon,
  label,
  children,
  hint,
}: {
  variant: "light" | "dark";
  icon: ReactNode;
  label: string;
  children: ReactNode;
  /** Always pass a string (use &nbsp; / static copy) so footers align across cards */
  hint: string;
}) {
  const isDark = variant === "dark";
  return (
    <div
      className={cn(
        // Grid stretch equalizes card height; pad = CARD_PAD (p-2 sm:p-4)
        "flex h-full flex-col rounded-xl border",
        CARD_PAD_CLASS,
        isDark
          ? "border-white/10 bg-dark-300/80"
          : "border-gray-200 bg-white shadow-sm",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg border",
            isDark
              ? "border-white/15 bg-white/5 text-light-100"
              : "border-gray-200 bg-gray-50 text-gray-600",
          )}
          aria-hidden
        >
          {icon}
        </span>
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-wide",
            isDark ? "text-light-200/70" : "text-gray-500",
          )}
        >
          {label}
        </span>
      </div>
      {/* Middle band grows; hint sits on the natural bottom edge of p-4 */}
      <div className="flex min-h-0 flex-1 items-center">{children}</div>
      <p
        className={cn(
          "mt-2 line-clamp-2 text-xs leading-normal",
          isDark ? "text-light-200/55" : "text-gray-500",
        )}
      >
        {hint}
      </p>
    </div>
  );
}

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
      <KpiShell
        variant={variant}
        icon={<CircleDot className="size-4" />}
        label="Status"
        hint={statusHint ?? "Current ticket status"}
      >
        <TicketStatusBadge status={status} variant={variant} />
      </KpiShell>
      <KpiShell
        variant={variant}
        icon={<AlertTriangle className="size-4" />}
        label="Priority"
        hint={priorityHint ?? "Urgency for support triage"}
      >
        <TicketPriorityBadge priority={priority} variant={variant} />
      </KpiShell>
      <KpiShell
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
            "text-2xl font-semibold tabular-nums tracking-tight",
            variant === "dark" ? "text-light-100" : "text-dark-400",
          )}
        >
          {messageCount}
        </p>
      </KpiShell>
      <KpiShell
        variant={variant}
        icon={<UsersRound className="size-4" />}
        label="Assigned To"
        hint={assignedHint ?? "Who handles this ticket"}
      >
        <div className="min-w-0">{assignedSlot}</div>
      </KpiShell>
    </div>
  );
}
