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
  adminCreateSupportTicketSchema,
  createSupportTicketSchema,
  ticketPrioritySchema,
  ticketStatusSchema,
} from "@/lib/validations/supportTicket";
import { db } from "@/database/drizzle";
import { supportTickets, users } from "@/database/schema";
import { logActivity, truncateForLog } from "@/lib/admin/activityLog";
import {
  createInAppNotificationForUsers,
  getAllAdminUsers,
} from "@/lib/notifications/inApp";
import { notifyTicketCreated } from "@/lib/email/supportTicketEmails";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { and, eq } from "drizzle-orm";

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
    const rawRequesterId =
      typeof body === "object" &&
      body !== null &&
      "requesterUserId" in body &&
      typeof (body as { requesterUserId?: unknown }).requesterUserId === "string"
        ? (body as { requesterUserId: string }).requesterUserId
        : undefined;

    if (rawRequesterId && actor.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "Only admins may file tickets on behalf of another user.",
        },
        { status: 403 },
      );
    }

    const adminParsed = rawRequesterId
      ? adminCreateSupportTicketSchema.safeParse(body)
      : null;
    const userParsed = adminParsed
      ? null
      : createSupportTicketSchema.safeParse(body);

    if (adminParsed && !adminParsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid ticket data",
          message: adminParsed.error.issues
            .map((issue) => issue.message)
            .join(", "),
        },
        { status: 400 },
      );
    }
    if (userParsed && !userParsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid ticket data",
          message: userParsed.error.issues.map((issue) => issue.message).join(", "),
        },
        { status: 400 },
      );
    }

    const ticketFields = (adminParsed?.success
      ? adminParsed.data
      : userParsed!.data)!;
    let ticketUserId = actor.id;
    let requesterName = actor.name;
    let onBehalfOf: string | undefined;

    if (adminParsed?.success === true) {
      const requesterUserId = adminParsed.data.requesterUserId;
      const [requester] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          status: users.status,
        })
        .from(users)
        .where(
          and(
            eq(users.id, requesterUserId),
            eq(users.status, "APPROVED"),
          ),
        )
        .limit(1);

      if (!requester) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid requester",
            message: "Borrower must exist and be APPROVED.",
          },
          { status: 400 },
        );
      }

      ticketUserId = requester.id;
      requesterName = requester.fullName;
      onBehalfOf = requester.id;
    }

    const [created] = await db
      .insert(supportTickets)
      .values({
        subject: ticketFields.subject,
        description: ticketFields.description,
        priority: ticketFields.priority ?? "MEDIUM",
        relatedBookId: ticketFields.relatedBookId ?? null,
        userId: ticketUserId,
      })
      .returning({ id: supportTickets.id });

    revalidateMutationPaths("ticket.write");

    await logActivity({
      actorId: actor.id,
      action: "CREATE",
      entityType: "ticket",
      entityId: created.id,
      details: {
        subject: truncateForLog(ticketFields.subject),
        ...(onBehalfOf ? { onBehalfOf } : {}),
      },
    });

    // Fan out to admins — fire-and-forget, never blocks the response.
    void (async () => {
      const admins = await getAllAdminUsers(actor.id);
      const creatorLabel = onBehalfOf
        ? `${actor.name} (on behalf of ${requesterName})`
        : actor.name;

      if (admins.length > 0) {
        await createInAppNotificationForUsers(
          admins.map((admin) => admin.id),
          {
            type: "TICKET_CREATED",
            title: "New support ticket",
            message: `${creatorLabel} submitted: "${ticketFields.subject}"`,
            link: `/admin/support-tickets/${created.id}`,
          },
        );

        await notifyTicketCreated({
          recipients: admins.map((admin) => admin.email),
          creatorName: creatorLabel,
          ticketId: created.id,
          ticketSubject: ticketFields.subject,
        });
      }

      // Notify borrower when admin filed on their behalf (skip if actor is the requester).
      if (onBehalfOf && onBehalfOf !== actor.id) {
        await createInAppNotificationForUsers([onBehalfOf], {
          type: "TICKET_CREATED",
          title: "Support ticket opened",
          message: `A ticket was opened on your behalf: "${ticketFields.subject}"`,
          link: `/support-tickets/${created.id}`,
        });
      }
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
