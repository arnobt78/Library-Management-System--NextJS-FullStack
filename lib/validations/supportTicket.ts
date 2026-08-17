/**
 * Support Ticket Zod schemas — SSR + API input validation.
 * Parent: CR-0003 / REQ-0034
 */
import { z } from "zod";

export const ticketStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

export const ticketPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

/** Only the creator submits these — server derives userId, never trusts client. */
export const createSupportTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, "Subject must be at least 5 characters")
    .max(255, "Subject must be less than 255 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be less than 2000 characters"),
  priority: ticketPrioritySchema.optional(),
  relatedBookId: z.string().uuid().optional().nullable(),
});

/** Admin filing on behalf of an APPROVED borrower — server sets userId from requesterUserId. */
export const adminCreateSupportTicketSchema = createSupportTicketSchema.extend({
  requesterUserId: z.string().uuid(),
});

/**
 * Admin-only mutable fields (status/assignment/notes). Priority is also
 * creator-editable while OPEN/IN_PROGRESS — enforced in ticketPolicy + route.
 */
export const updateSupportTicketSchema = z.object({
  subject: z.string().trim().min(5).max(255).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const createSupportTicketReplySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Reply cannot be empty")
    .max(2000, "Reply must be less than 2000 characters"),
});
