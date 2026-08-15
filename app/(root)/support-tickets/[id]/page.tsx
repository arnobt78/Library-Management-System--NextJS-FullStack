/**
 * My Support Ticket Detail — creator's own view (admin uses
 * /admin/support-tickets/[id] instead). Parent: CR-0003 / REQ-0034
 *
 * Missing / unauthorized → redirect to list (not notFound) so hard-delete
 * remount never paints branded/default 404 before client soft-nav.
 */
import React from "react";
import { redirect } from "next/navigation";
import { requireAuthenticatedActor } from "@/lib/auth/authorization";
import { getSupportTicketDetail } from "@/lib/server/supportTicketData";
import { canViewTicket } from "@/lib/services/ticketPolicy";
import SupportTicketDetailContent from "@/components/support-tickets/SupportTicketDetailContent";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireAuthenticatedActor();
  const { id } = await params;

  const ticket = await getSupportTicketDetail(id);
  if (!ticket) {
    redirect("/support-tickets");
  }
  if (!canViewTicket(actor, { userId: ticket.userId })) {
    redirect("/support-tickets");
  }

  return (
    <SupportTicketDetailContent
      initialTicket={JSON.parse(JSON.stringify(ticket))}
      currentUserId={actor.id}
    />
  );
};

export default Page;
