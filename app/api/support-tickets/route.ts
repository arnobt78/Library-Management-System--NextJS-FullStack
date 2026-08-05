/**
 * GET /api/support-tickets?scope=admin|mine — list tickets
 * POST /api/support-tickets — create a ticket (APPROVED actor only)
 * Parent: CR-0003 / REQ-0034
 */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import {
  authorizeAdminRoute,
  authorizeAuthenticatedRoute,
} from "@/lib/auth/routeAuthorization";
import {
  getAdminSupportTickets,
  getSupportTicketDetail,
  getUserSupportTickets,
} from "@/lib/server/supportTicketData";
import {
  createSupportTicketSchema,
  ticketPrioritySchema,
  ticketStatusSchema,
} from "@/lib/validations/supportTicket";
import { db } from "@/database/drizzle";
import { supportTickets } from "@/database/schema";
import { logActivity, truncateForLog } from "@/lib/admin/activityLog";
import {
  createInAppNotificationForUsers,
  getAllAdminUsers,
} from "@/lib/notifications/inApp";
import { notifyTicketCreated } from "@/lib/email/supportTicketEmails";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") === "admin" ? "admin" : "mine";
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const status = ticketStatusSchema.safeParse(statusParam).success
      ? (statusParam as TicketStatusValue)
      : undefined;
    const priority = ticketPrioritySchema.safeParse(priorityParam).success
      ? (priorityParam as TicketPriorityValue)
      : undefined;
    const search = searchParams.get("search") || undefined;

    if (scope === "admin") {
      const authorization = await authorizeAdminRoute();
      if (!authorization.ok) return authorization.response;

      const tickets = await getAdminSupportTickets({ status, priority, search });
      return NextResponse.json({ success: true, tickets });
    }

    const authorization = await authorizeAuthenticatedRoute();
    if (!authorization.ok) return authorization.response;

    const tickets = await getUserSupportTickets(authorization.actor.id, {
      status,
      search,
    });
    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch support tickets",
        message: "Support tickets are temporarily unavailable.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    // APPROVED-only — same eligibility gate as borrowing/reviewing.
    const authorization = await authorizeAuthenticatedRoute();
    if (!authorization.ok) return authorization.response;
    const { actor } = authorization;

    const body = await request.json();
    const parsed = createSupportTicketSchema.safeParse(body);
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

    const [created] = await db
      .insert(supportTickets)
      .values({
        subject: parsed.data.subject,
        description: parsed.data.description,
        priority: parsed.data.priority ?? "MEDIUM",
        relatedBookId: parsed.data.relatedBookId ?? null,
        userId: actor.id,
      })
      .returning({ id: supportTickets.id });

    revalidateMutationPaths("ticket.write");

    void logActivity({
      actorId: actor.id,
      action: "CREATE",
      entityType: "ticket",
      entityId: created.id,
      details: { subject: truncateForLog(parsed.data.subject) },
    });

    // Fan out to admins — fire-and-forget, never blocks the response.
    void (async () => {
      const admins = await getAllAdminUsers(actor.id);
      if (admins.length === 0) return;

      await createInAppNotificationForUsers(
        admins.map((admin) => admin.id),
        {
          type: "TICKET_CREATED",
          title: "New support ticket",
          message: `${actor.name} submitted: "${parsed.data.subject}"`,
          link: `/admin/support-tickets/${created.id}`,
        },
      );

      await notifyTicketCreated({
        recipients: admins.map((admin) => admin.email),
        creatorName: actor.name,
        ticketId: created.id,
        ticketSubject: parsed.data.subject,
      });
    })();

    const ticket = await getSupportTicketDetail(created.id);
    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create support ticket",
        message: "The ticket could not be created.",
      },
      { status: 500 },
    );
  }
}
