/**
 * GET /api/support-tickets/[id]/replies — reply thread
 * POST /api/support-tickets/[id]/replies — add a reply, notify the other party
 * Parent: CR-0003 / REQ-0034
 */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { db } from "@/database/drizzle";
import { supportTickets, supportTicketReplies, users } from "@/database/schema";
import { eq, inArray } from "drizzle-orm";
import { authorizeAuthenticatedRoute } from "@/lib/auth/routeAuthorization";
import {
  getSupportTicketAccessRow,
  getTicketReplies,
} from "@/lib/server/supportTicketData";
import { createSupportTicketReplySchema } from "@/lib/validations/supportTicket";
import { canReplyToTicket } from "@/lib/services/ticketPolicy";
import {
  createInAppNotification,
  createInAppNotificationForUsers,
  getAllAdminUsers,
} from "@/lib/notifications/inApp";
import { notifyTicketReply } from "@/lib/email/supportTicketEmails";
import { logActivity, truncateForLog } from "@/lib/admin/activityLog";
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
    const ticket = await getSupportTicketAccessRow(id);
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 },
      );
    }
    if (!canReplyToTicket(actor, ticket)) {
      // 404 (not 403) — same ownership-leak fix as the detail route: a
      // non-owner, non-admin caller must not be able to tell "doesn't exist"
      // apart from "exists but isn't yours" from the response status alone.
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 },
      );
    }

    const replies = await getTicketReplies(id);
    return NextResponse.json({ success: true, replies });
  } catch (error) {
    console.error("Error fetching ticket replies:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch replies",
        message: "Replies are temporarily unavailable.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
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
    const ticket = await getSupportTicketAccessRow(id);
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 },
      );
    }
    if (!canReplyToTicket(actor, ticket)) {
      // 404 (not 403) — same ownership-leak fix as the detail route.
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = createSupportTicketReplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid reply",
          message: parsed.error.issues.map((issue) => issue.message).join(", "),
        },
        { status: 400 },
      );
    }

    await db.insert(supportTicketReplies).values({
      ticketId: id,
      userId: actor.id,
      body: parsed.data.body,
    });
    await db
      .update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, id));

    revalidateMutationPaths("ticket.write");

    // Reply mutates the ticket thread — audit as UPDATE so Activity History
    // shows it like create/update/delete. `ticket.write` already invalidates
    // activityLog on the client (no registry change needed).
    void logActivity({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "ticket",
      entityId: id,
      details: {
        subject: truncateForLog(ticket.subject),
        reply: true,
      },
    });

    const isActorCreator = actor.id === ticket.userId;

    // Notify the other side of the conversation — fire-and-forget.
    void (async () => {
      if (isActorCreator) {
        const recipientIds = ticket.assignedToId
          ? [ticket.assignedToId]
          : (await getAllAdminUsers(actor.id)).map((admin) => admin.id);
        if (recipientIds.length === 0) return;

        await createInAppNotificationForUsers(recipientIds, {
          type: "TICKET_REPLY",
          title: "New reply on a support ticket",
          message: `${actor.name} replied: "${ticket.subject}"`,
          link: `/admin/support-tickets/${id}`,
        });

        const recipients = await db
          .select({ email: users.email })
          .from(users)
          .where(inArray(users.id, recipientIds));
        await Promise.all(
          recipients.map((recipient) =>
            notifyTicketReply({
              to: recipient.email,
              replierName: actor.name,
              ticketId: id,
              ticketSubject: ticket.subject,
              isAdminSide: false,
            }),
          ),
        );
      } else {
        // isActorCreator is false here, so the replier is always someone
        // other than the ticket's own creator — always notify the creator.
        await createInAppNotification({
          userId: ticket.userId,
          type: "TICKET_REPLY",
          title: "New reply on your support ticket",
          message: `${actor.name} replied: "${ticket.subject}"`,
          link: `/support-tickets/${id}`,
        });

        const [creator] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, ticket.userId))
          .limit(1);
        if (creator?.email) {
          await notifyTicketReply({
            to: creator.email,
            replierName: actor.name,
            ticketId: id,
            ticketSubject: ticket.subject,
            isAdminSide: true,
          });
        }
      }
    })();

    const replies = await getTicketReplies(id);
    return NextResponse.json({ success: true, replies }, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket reply:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create reply",
        message: "The reply could not be sent.",
      },
      { status: 500 },
    );
  }
}
