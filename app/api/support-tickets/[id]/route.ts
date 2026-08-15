/**
 * GET /api/support-tickets/[id] — ticket detail + replies
 * PUT /api/support-tickets/[id] — creator edits subject/description while OPEN;
 *   admin edits status/priority/assignedToId/notes (and content any time)
 * DELETE /api/support-tickets/[id] — admin any time; creator only while OPEN
 * Parent: CR-0003 / REQ-0034
 */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { db } from "@/database/drizzle";
import { supportTickets, users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { authorizeAuthenticatedRoute } from "@/lib/auth/routeAuthorization";
import {
  getSupportTicketAccessRow,
  getSupportTicketDetail,
} from "@/lib/server/supportTicketData";
import { updateSupportTicketSchema } from "@/lib/validations/supportTicket";
import {
  canDeleteTicket,
  canEditTicketContent,
  canManageTicketAdminFields,
  canViewTicket,
} from "@/lib/services/ticketPolicy";
import { logActivity, truncateForLog } from "@/lib/admin/activityLog";
import { createInAppNotification } from "@/lib/notifications/inApp";
import { notifyTicketUpdated } from "@/lib/email/supportTicketEmails";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authorization = await authorizeAuthenticatedRoute();
    if (!authorization.ok) return authorization.response;
    const { actor } = authorization;

    const { id } = await params;
    const ticket = await getSupportTicketDetail(id);
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 },
      );
    }

    if (!canViewTicket(actor, { userId: ticket.userId })) {
      // 404 (not 403) — matches app/api/reviews/edit/[reviewId]/route.ts:
      // a non-owner, non-admin caller must not be able to distinguish
      // "this ticket doesn't exist" from "this ticket exists but isn't yours".
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("Error fetching support ticket:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch support ticket",
        message: "The ticket is temporarily unavailable.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Rate limiting to prevent abuse (same IP-based guard as review mutations).
    const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 },
      );
    }

    const authorization = await authorizeAuthenticatedRoute();
    if (!authorization.ok) return authorization.response;
    const { actor } = authorization;

    const { id } = await params;
    const existing = await getSupportTicketAccessRow(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 },
      );
    }
    // Same existence-vs-ownership gate as GET: non-viewers get 404 so a
    // crafted id cannot reveal that a ticket exists. Action-policy 403s below
    // remain for viewers who fail a specific rule (e.g. owner editing when
    // not OPEN, non-admin setting admin fields).
    if (!canViewTicket(actor, existing)) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateSupportTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid ticket data",
          message: parsed.error.issues.map((issue) => issue.message).join(", "),
        },
        { status: 400 },
      );
    }

    const hasAdminFields =
      parsed.data.status !== undefined ||
      parsed.data.assignedToId !== undefined ||
      parsed.data.notes !== undefined;
    // Priority is editable by creator (content path) OR admin (admin fields).
    const hasPriorityField = parsed.data.priority !== undefined;
    const hasContentFields =
      parsed.data.subject !== undefined ||
      parsed.data.description !== undefined ||
      hasPriorityField;

    if (hasAdminFields && !canManageTicketAdminFields(actor)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only an admin can change ticket status, assignment, or notes",
        },
        { status: 403 },
      );
    }
    // Assignment target must itself be an admin — the FK only guarantees a
    // valid user id, so a crafted request could otherwise assign a regular
    // user without this explicit role check.
    if (parsed.data.assignedToId) {
      const [assignee] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, parsed.data.assignedToId))
        .limit(1);
      if (!assignee || assignee.role !== "ADMIN") {
        return NextResponse.json(
          { success: false, error: "assignedToId must reference an existing admin" },
          { status: 400 },
        );
      }
    }
    if (hasContentFields && !canEditTicketContent(actor, existing)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You can only edit this ticket while it is Open or In Progress",
        },
        { status: 403 },
      );
    }
    if (!hasAdminFields && !hasContentFields) {
      return NextResponse.json(
        { success: false, error: "No changes provided" },
        { status: 400 },
      );
    }

    const statusChanged =
      parsed.data.status !== undefined && parsed.data.status !== existing.status;
    const assigneeChanged =
      parsed.data.assignedToId !== undefined &&
      parsed.data.assignedToId !== existing.assignedToId;

    const updateValues: Partial<typeof supportTickets.$inferInsert> = {
      updatedBy: actor.id,
      updatedAt: new Date(),
    };
    if (parsed.data.subject !== undefined) updateValues.subject = parsed.data.subject;
    if (parsed.data.description !== undefined)
      updateValues.description = parsed.data.description;
    if (parsed.data.status !== undefined) updateValues.status = parsed.data.status;
    if (parsed.data.priority !== undefined) updateValues.priority = parsed.data.priority;
    if (parsed.data.assignedToId !== undefined)
      updateValues.assignedToId = parsed.data.assignedToId;
    if (parsed.data.notes !== undefined) updateValues.notes = parsed.data.notes;

    await db
      .update(supportTickets)
      .set(updateValues)
      .where(eq(supportTickets.id, id));

    revalidateMutationPaths("ticket.write");

    await logActivity({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "ticket",
      entityId: id,
      details: {
        subject: truncateForLog(existing.subject),
        ...(statusChanged ? { status: parsed.data.status } : {}),
        ...(parsed.data.priority !== undefined
          ? { priority: parsed.data.priority }
          : {}),
        ...(assigneeChanged
          ? { assignedToId: parsed.data.assignedToId ?? null }
          : {}),
        ...(parsed.data.notes !== undefined ? { notesUpdated: true } : {}),
      },
    });

    // Notify the creator of admin-driven status/assignment changes — never the actor's own action.
    if ((statusChanged || assigneeChanged) && actor.id !== existing.userId) {
      void createInAppNotification({
        userId: existing.userId,
        type: "TICKET_UPDATED",
        title: "Your support ticket was updated",
        message: statusChanged
          ? `Status changed to ${parsed.data.status}: "${existing.subject}"`
          : `Your ticket was reassigned: "${existing.subject}"`,
        link: `/support-tickets/${id}`,
      });
    }

    if (statusChanged && actor.id !== existing.userId) {
      const [creator] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, existing.userId))
        .limit(1);
      if (creator?.email) {
        void notifyTicketUpdated({
          to: creator.email,
          ticketId: id,
          ticketSubject: existing.subject,
          status: parsed.data.status ?? existing.status,
        });
      }
    }

    const ticket = await getSupportTicketDetail(id);
    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("Error updating support ticket:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update support ticket",
        message: "The ticket could not be updated.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Rate limiting to prevent abuse (same IP-based guard as review mutations).
    const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 },
      );
    }

    const authorization = await authorizeAuthenticatedRoute();
    if (!authorization.ok) return authorization.response;
    const { actor } = authorization;

    const { id } = await params;
    const existing = await getSupportTicketAccessRow(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 },
      );
    }
    // Non-viewer → 404 (no existence leak). Viewer who owns a non-OPEN
    // ticket still gets the honest 403 below.
    if (!canViewTicket(actor, existing)) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 },
      );
    }

    if (!canDeleteTicket(actor, existing)) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only delete your own ticket while it is still OPEN",
        },
        { status: 403 },
      );
    }

    await db.delete(supportTickets).where(eq(supportTickets.id, id));

    revalidateMutationPaths("ticket.write", {
      // Skip detail RSC — client soft-navs to list; remounting missing id flashes 404.
      omit: ["/admin/support-tickets/[id]", "/support-tickets/[id]"],
    });
    await logActivity({
      actorId: actor.id,
      action: "DELETE",
      entityType: "ticket",
      entityId: id,
      details: { subject: truncateForLog(existing.subject) },
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error deleting support ticket:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete support ticket",
        message: "The ticket could not be deleted.",
      },
      { status: 500 },
    );
  }
}
