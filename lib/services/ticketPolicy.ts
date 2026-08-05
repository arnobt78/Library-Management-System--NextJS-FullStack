/**
 * Support ticket authorization policy — pure, server-only predicates shared
 * by every `/api/support-tickets*` route. Never trust client-supplied
 * userId/assignedToId; callers must pass the server-derived actor + the
 * ticket row already loaded from the database.
 * Parent: CR-0003 / REQ-0034
 */
import "server-only";

import type { AuthorizedActor } from "@/lib/auth/authorization";
import type { TicketStatus } from "@/lib/validations/supportTicket";

export interface TicketAccessContext {
  userId: string;
  assignedToId?: string | null;
  status?: TicketStatus;
}

/** Admin sees everything; the creator sees only their own ticket. */
export function canViewTicket(
  actor: AuthorizedActor,
  ticket: TicketAccessContext,
): boolean {
  return actor.role === "ADMIN" || actor.id === ticket.userId;
}

/** Same rule as viewing — anyone who can see the thread can reply to it. */
export function canReplyToTicket(
  actor: AuthorizedActor,
  ticket: TicketAccessContext,
): boolean {
  return canViewTicket(actor, ticket);
}

/**
 * Creator may edit subject/description/priority while OPEN or IN_PROGRESS
 * (before resolve/close); admin can always edit content.
 */
export function canEditTicketContent(
  actor: AuthorizedActor,
  ticket: TicketAccessContext,
): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.id !== ticket.userId) return false;
  return ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
}

/** status / assignedToId / notes are admin-only. Priority is creator-editable via content path. */
export function canManageTicketAdminFields(actor: AuthorizedActor): boolean {
  return actor.role === "ADMIN";
}

/** Admin can delete any ticket; creator can delete while OPEN or IN_PROGRESS. */
export function canDeleteTicket(
  actor: AuthorizedActor,
  ticket: TicketAccessContext,
): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.id !== ticket.userId) return false;
  return ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
}
