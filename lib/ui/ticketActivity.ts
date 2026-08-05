/**
 * Build a chronological Activity feed for ticket detail (created / audit / replies).
 * Client-safe — no server imports. Parent: CR-0003 / REQ-0034
 */

export function buildTicketActivityTimeline(
  ticket: SupportTicketDetail,
  auditEvents: TicketActivityEvent[] = [],
): TicketActivityEvent[] {
  const events: TicketActivityEvent[] = [
    {
      id: `created-${ticket.id}`,
      kind: "created",
      at: ticket.createdAt,
      label: "Ticket created",
      actorId: ticket.userId,
      actorName: ticket.userName,
      actorEmail: ticket.userEmail,
      actorUniversityCard: ticket.userUniversityCard,
      detail: ticket.subject,
    },
  ];

  for (const audit of auditEvents) {
    // Skip CREATE audit if we already seed from ticket.createdAt
    if (audit.label === "Ticket created") continue;
    events.push(audit);
  }

  for (const reply of ticket.replies) {
    events.push({
      id: `reply-${reply.id}`,
      kind: "replied",
      at: reply.createdAt,
      label: reply.userRole === "ADMIN" ? "Staff replied" : "Requester replied",
      actorId: reply.userId,
      actorName: reply.userName,
      actorEmail: reply.userEmail,
      actorUniversityCard: reply.userUniversityCard,
      detail:
        reply.body.trim().length > 120
          ? `${reply.body.trim().slice(0, 119)}…`
          : reply.body.trim(),
    });
  }

  // Surface last updater when no audit row exists for the latest bump
  if (
    ticket.updatedById &&
    ticket.updatedAt &&
    ticket.updatedAt !== ticket.createdAt
  ) {
    const alreadyCovered = events.some(
      (e) =>
        e.kind === "audit" &&
        e.actorId === ticket.updatedById &&
        Math.abs(new Date(e.at).getTime() - new Date(ticket.updatedAt).getTime()) <
          5000,
    );
    if (!alreadyCovered) {
      events.push({
        id: `updated-${ticket.id}-${ticket.updatedAt}`,
        kind: "updated",
        at: ticket.updatedAt,
        label: "Ticket updated",
        actorId: ticket.updatedById,
        actorName: ticket.updatedByName,
        actorEmail: ticket.updatedByEmail,
        actorUniversityCard: ticket.updatedByUniversityCard,
        detail: null,
      });
    }
  }

  return events.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}
