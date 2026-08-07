/**
 * Support Ticket read path — shared by SSR pages and `/api/support-tickets*`
 * refetches. Plain server-only module (no "use server" pragma).
 * Parent: CR-0003 / REQ-0034 — list densify includes description + avatar cards
 */
import "server-only";

import { cache } from "react";
import { db } from "@/database/drizzle";
import {
  activityLogs,
  books,
  supportTicketReplies,
  supportTickets,
  users,
} from "@/database/schema";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type {
  TicketPriority,
  TicketStatus,
} from "@/lib/validations/supportTicket";

const assignee = alias(users, "ticket_assignee");
const updater = alias(users, "ticket_updater");
const activityActor = alias(users, "ticket_activity_actor");

interface SupportTicketRowRaw {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  userId: string;
  userName: string;
  userEmail: string;
  userUniversityCard: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  assignedToUniversityCard: string | null;
  relatedBookId: string | null;
  relatedBookTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminTicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  search?: string;
}

interface UserTicketFilters {
  status?: TicketStatus;
  search?: string;
}

/** Raw row used only for authorization decisions — no joins. */
interface SupportTicketAccessRow {
  id: string;
  userId: string;
  assignedToId: string | null;
  status: TicketStatus;
  subject: string;
}

function baseTicketSelect() {
  return db
    .select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      description: supportTickets.description,
      status: supportTickets.status,
      priority: supportTickets.priority,
      userId: supportTickets.userId,
      userName: users.fullName,
      userEmail: users.email,
      userUniversityCard: users.universityCard,
      assignedToId: supportTickets.assignedToId,
      assignedToName: assignee.fullName,
      assignedToEmail: assignee.email,
      assignedToUniversityCard: assignee.universityCard,
      relatedBookId: supportTickets.relatedBookId,
      relatedBookTitle: books.title,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
    })
    .from(supportTickets)
    .innerJoin(users, eq(supportTickets.userId, users.id))
    .leftJoin(assignee, eq(supportTickets.assignedToId, assignee.id))
    .leftJoin(books, eq(supportTickets.relatedBookId, books.id));
}

function mapListItem(
  row: SupportTicketRowRaw,
  replyCount: number,
): SupportTicketListItem {
  return {
    id: row.id,
    subject: row.subject,
    description: row.description ?? "",
    status: row.status,
    priority: row.priority,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    userUniversityCard: row.userUniversityCard ?? null,
    assignedToId: row.assignedToId,
    assignedToName: row.assignedToName,
    assignedToEmail: row.assignedToEmail ?? null,
    assignedToUniversityCard: row.assignedToUniversityCard ?? null,
    relatedBookId: row.relatedBookId,
    relatedBookTitle: row.relatedBookTitle,
    replyCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function attachReplyCounts(
  rows: SupportTicketRowRaw[],
): Promise<SupportTicketListItem[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const counts = await db
    .select({
      ticketId: supportTicketReplies.ticketId,
      count: sql<number>`count(*)`,
    })
    .from(supportTicketReplies)
    .where(inArray(supportTicketReplies.ticketId, ids))
    .groupBy(supportTicketReplies.ticketId);
  const countMap = new Map(counts.map((row) => [row.ticketId, Number(row.count)]));

  return rows.map((row) => mapListItem(row, countMap.get(row.id) ?? 0));
}

export async function getAdminSupportTickets(
  filters: AdminTicketFilters = {},
): Promise<SupportTicketListItem[]> {
  const q = filters.search?.trim();
  const conditions = [
    filters.status ? eq(supportTickets.status, filters.status) : undefined,
    filters.priority ? eq(supportTickets.priority, filters.priority) : undefined,
    q
      ? or(
          ilike(supportTickets.subject, `%${q}%`),
          ilike(supportTickets.description, `%${q}%`),
          ilike(users.fullName, `%${q}%`),
          ilike(users.email, `%${q}%`),
        )
      : undefined,
  ].filter(Boolean);

  const rows = await baseTicketSelect()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(supportTickets.createdAt));

  return attachReplyCounts(rows);
}

export async function getUserSupportTickets(
  userId: string,
  filters: UserTicketFilters = {},
): Promise<SupportTicketListItem[]> {
  const q = filters.search?.trim();
  const conditions = [
    eq(supportTickets.userId, userId),
    filters.status ? eq(supportTickets.status, filters.status) : undefined,
    q
      ? or(
          ilike(supportTickets.subject, `%${q}%`),
          ilike(supportTickets.description, `%${q}%`),
        )
      : undefined,
  ].filter(Boolean);

  const rows = await baseTicketSelect()
    .where(and(...conditions))
    .orderBy(desc(supportTickets.createdAt));

  return attachReplyCounts(rows);
}

export async function getTicketReplies(
  ticketId: string,
): Promise<SupportTicketReplyRow[]> {
  const rows = await db
    .select({
      id: supportTicketReplies.id,
      ticketId: supportTicketReplies.ticketId,
      userId: supportTicketReplies.userId,
      userName: users.fullName,
      userEmail: users.email,
      userUniversityCard: users.universityCard,
      userRole: users.role,
      body: supportTicketReplies.body,
      createdAt: supportTicketReplies.createdAt,
    })
    .from(supportTicketReplies)
    .innerJoin(users, eq(supportTicketReplies.userId, users.id))
    .where(eq(supportTicketReplies.ticketId, ticketId))
    .orderBy(asc(supportTicketReplies.createdAt));

  return rows.map((row) => ({
    ...row,
    userUniversityCard: row.userUniversityCard ?? null,
    userRole: (row.userRole ?? "USER") as "USER" | "ADMIN",
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getSupportTicketDetail(
  ticketId: string,
): Promise<SupportTicketDetail | null> {
  const [row] = await baseTicketSelect().where(eq(supportTickets.id, ticketId)).limit(1);
  if (!row) return null;

  // Notes + last updater stay detail-only (not needed on list densify).
  const [content] = await db
    .select({
      notes: supportTickets.notes,
      updatedById: supportTickets.updatedBy,
      updatedByName: updater.fullName,
      updatedByEmail: updater.email,
      updatedByUniversityCard: updater.universityCard,
    })
    .from(supportTickets)
    .leftJoin(updater, eq(supportTickets.updatedBy, updater.id))
    .where(eq(supportTickets.id, ticketId))
    .limit(1);

  const replies = await getTicketReplies(ticketId);

  return {
    ...mapListItem(row, replies.length),
    notes: content?.notes ?? null,
    replies,
    updatedById: content?.updatedById ?? null,
    updatedByName: content?.updatedByName ?? null,
    updatedByEmail: content?.updatedByEmail ?? null,
    updatedByUniversityCard: content?.updatedByUniversityCard ?? null,
  };
}

/**
 * Activity-log rows for one ticket (admin detail timeline).
 * Global FIFO-50 may drop older ticket events — still useful for recent edits.
 */
export async function getTicketAuditEvents(
  ticketId: string,
): Promise<TicketActivityEvent[]> {
  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      details: activityLogs.details,
      createdAt: activityLogs.createdAt,
      actorId: activityLogs.actorId,
      actorName: activityActor.fullName,
      actorEmail: activityActor.email,
      actorUniversityCard: activityActor.universityCard,
    })
    .from(activityLogs)
    .leftJoin(activityActor, eq(activityLogs.actorId, activityActor.id))
    .where(
      and(
        eq(activityLogs.entityType, "ticket"),
        eq(activityLogs.entityId, ticketId),
      ),
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(40);

  return rows.map((row) => {
    const details = (row.details as Record<string, unknown> | null) ?? null;
    const status =
      typeof details?.status === "string" ? details.status : null;
    const priority =
      typeof details?.priority === "string" ? details.priority : null;
    const notesUpdated = details?.notesUpdated === true;
    const assigneeTouched = Object.prototype.hasOwnProperty.call(
      details ?? {},
      "assignedToId",
    );
    const subject =
      typeof details?.subject === "string" ? details.subject : null;

    let label = "Ticket updated";
    if (row.action === "CREATE") label = "Ticket created";
    else if (row.action === "DELETE") label = "Ticket deleted";
    else if (status) label = `Status → ${String(status).split("_").join(" ")}`;
    else if (priority) label = `Priority → ${priority}`;
    else if (assigneeTouched) label = "Assignee updated";
    else if (notesUpdated) label = "Internal notes updated";

    return {
      id: row.id,
      kind: "audit" as const,
      at: row.createdAt.toISOString(),
      label,
      actorId: row.actorId,
      actorName: row.actorName,
      actorEmail: row.actorEmail,
      actorUniversityCard: row.actorUniversityCard ?? null,
      detail: subject,
    };
  });
}

/** Minimal row for authorization checks — avoids loading joins on every write. */
export async function getSupportTicketAccessRow(
  ticketId: string,
): Promise<SupportTicketAccessRow | null> {
  const [row] = await db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      assignedToId: supportTickets.assignedToId,
      status: supportTickets.status,
      subject: supportTickets.subject,
    })
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  return row ?? null;
}

/** Assignee picker source — every admin (+ avatar card for Select densify). */
export async function getAssignableAdmins(): Promise<
  {
    id: string;
    name: string;
    email: string;
    universityCard: string | null;
  }[]
> {
  const rows = await db
    .select({
      id: users.id,
      name: users.fullName,
      email: users.email,
      universityCard: users.universityCard,
    })
    .from(users)
    .where(eq(users.role, "ADMIN"))
    .orderBy(asc(users.fullName));
  return rows;
}

/** Ticket KPI breakdown for Library Overview (OPEN+IN_PROGRESS still drives nav). */
export type SupportTicketOverviewCounts = {
  openTicketCount: number;
  ticketsOpen: number;
  ticketsInProgress: number;
  ticketsResolved: number;
  /** URGENT priority among OPEN or IN_PROGRESS */
  ticketsUrgentOpen: number;
};

/**
 * Ticket status/priority aggregates for admin.stats badges.
 * Wrapped in React `cache()` so layout nav + overview share one round trip.
 */
export const getSupportTicketOverviewCounts = cache(
  async (): Promise<SupportTicketOverviewCounts> => {
    const rows = await db
      .select({
        ticketsOpen: sql<number>`count(*) filter (where ${supportTickets.status} = 'OPEN')`,
        ticketsInProgress: sql<number>`count(*) filter (where ${supportTickets.status} = 'IN_PROGRESS')`,
        ticketsResolved: sql<number>`count(*) filter (where ${supportTickets.status} = 'RESOLVED')`,
        ticketsUrgentOpen: sql<number>`count(*) filter (
          where ${supportTickets.priority} = 'URGENT'
            and ${supportTickets.status} in ('OPEN', 'IN_PROGRESS')
        )`,
      })
      .from(supportTickets);

    const ticketsOpen = Number(rows[0]?.ticketsOpen ?? 0);
    const ticketsInProgress = Number(rows[0]?.ticketsInProgress ?? 0);
    const ticketsResolved = Number(rows[0]?.ticketsResolved ?? 0);
    const ticketsUrgentOpen = Number(rows[0]?.ticketsUrgentOpen ?? 0);

    return {
      openTicketCount: ticketsOpen + ticketsInProgress,
      ticketsOpen,
      ticketsInProgress,
      ticketsResolved,
      ticketsUrgentOpen,
    };
  },
);

/**
 * Sidebar badge — open + in-progress tickets awaiting admin action.
 * Dedupes with getSupportTicketOverviewCounts in the same request.
 */
export const getOpenTicketCount = cache(async (): Promise<number> => {
  const counts = await getSupportTicketOverviewCounts();
  return counts.openTicketCount;
});
