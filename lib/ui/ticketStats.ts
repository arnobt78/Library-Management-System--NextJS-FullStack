/**
 * Shared ticket-list KPI counters. User and admin pages pick which fields
 * to display (user folds CLOSED into Resolved; admin keeps Resolved separate
 * and shows Urgent Open) — this helper only owns the math.
 * Parent: CR-0003 / REQ-0034 cosmetic DRY
 */
import type { TicketPriority, TicketStatus } from "@/lib/validations/supportTicket";

export interface TicketListStatsInput {
  status: TicketStatus;
  priority: TicketPriority;
}

export interface TicketListStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  /** URGENT priority and not CLOSED — matches prior admin "Urgent Open" card. */
  urgentOpen: number;
}

export function computeTicketListStats(
  tickets: TicketListStatsInput[],
): TicketListStats {
  let open = 0;
  let inProgress = 0;
  let resolved = 0;
  let closed = 0;
  let urgentOpen = 0;

  for (const ticket of tickets) {
    if (ticket.status === "OPEN") open += 1;
    else if (ticket.status === "IN_PROGRESS") inProgress += 1;
    else if (ticket.status === "RESOLVED") resolved += 1;
    else if (ticket.status === "CLOSED") closed += 1;

    if (ticket.priority === "URGENT" && ticket.status !== "CLOSED") {
      urgentOpen += 1;
    }
  }

  return {
    total: tickets.length,
    open,
    inProgress,
    resolved,
    closed,
    urgentOpen,
  };
}
