/**
 * Support Tickets Service — pure API functions (client fetch wrappers).
 * Parent: CR-0003 / REQ-0034
 *
 * No React Query logic here — see hooks/useQueries.ts + hooks/useMutations.ts.
 */
import { ApiError } from "./apiError";
import type {
  TicketPriority,
  TicketStatus,
} from "@/lib/validations/supportTicket";

export interface AdminTicketListFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  search?: string;
}

export interface UserTicketListFilters {
  status?: TicketStatus;
  search?: string;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  priority?: TicketPriority;
  relatedBookId?: string | null;
  /** Admin-only — server sets ticket userId from this APPROVED borrower. */
  requesterUserId?: string;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToId?: string | null;
  notes?: string | null;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }
  return response.json();
}

function buildQuery(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/** Admin moderation queue — every ticket, all creators. */
export async function getAdminSupportTickets(
  filters: AdminTicketListFilters = {},
): Promise<SupportTicketListItem[]> {
  const qs = buildQuery({ scope: "admin", ...filters });
  const response = await fetch(`/api/support-tickets${qs}`, { method: "GET" });
  const data = await parseJsonOrThrow<{ tickets: SupportTicketListItem[] }>(response);
  return data.tickets ?? [];
}

/** Signed-in user's own tickets (admin-as-user uses this too on /support-tickets). */
export async function getUserSupportTickets(
  filters: UserTicketListFilters = {},
): Promise<SupportTicketListItem[]> {
  const qs = buildQuery({ scope: "mine", ...filters });
  const response = await fetch(`/api/support-tickets${qs}`, { method: "GET" });
  const data = await parseJsonOrThrow<{ tickets: SupportTicketListItem[] }>(response);
  return data.tickets ?? [];
}

export async function getSupportTicketDetail(
  ticketId: string,
): Promise<SupportTicketDetail> {
  const response = await fetch(`/api/support-tickets/${ticketId}`, { method: "GET" });
  const data = await parseJsonOrThrow<{ ticket: SupportTicketDetail }>(response);
  return data.ticket;
}

export async function createSupportTicket(
  input: CreateTicketInput,
): Promise<SupportTicketDetail> {
  const response = await fetch("/api/support-tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{ ticket: SupportTicketDetail }>(response);
  return data.ticket;
}

export async function updateSupportTicket(
  ticketId: string,
  input: UpdateTicketInput,
): Promise<SupportTicketDetail> {
  const response = await fetch(`/api/support-tickets/${ticketId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{ ticket: SupportTicketDetail }>(response);
  return data.ticket;
}

export async function deleteSupportTicket(ticketId: string): Promise<void> {
  const response = await fetch(`/api/support-tickets/${ticketId}`, {
    method: "DELETE",
  });
  await parseJsonOrThrow<{ success: boolean }>(response);
}

/** Admin sidebar badge — OPEN + IN_PROGRESS ticket count. */
export async function getOpenTicketCount(): Promise<number> {
  const response = await fetch("/api/support-tickets/count", { method: "GET" });
  const data = await parseJsonOrThrow<{ count: number }>(response);
  return data.count ?? 0;
}

export async function createSupportTicketReply(
  ticketId: string,
  body: string,
): Promise<SupportTicketReplyRow[]> {
  const response = await fetch(`/api/support-tickets/${ticketId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const data = await parseJsonOrThrow<{ replies: SupportTicketReplyRow[] }>(response);
  return data.replies ?? [];
}
