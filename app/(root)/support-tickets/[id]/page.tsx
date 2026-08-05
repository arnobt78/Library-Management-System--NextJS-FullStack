/**
 * My Support Ticket Detail — creator's own view (admin uses
 * /admin/support-tickets/[id] instead). Parent: CR-0003 / REQ-0034
 */
import React from "react";
import { notFound } from "next/navigation";
import { requireAuthenticatedActor } from "@/lib/auth/authorization";
import { getSupportTicketDetail } from "@/lib/server/supportTicketData";
import { canViewTicket } from "@/lib/services/ticketPolicy";
import SupportTicketDetailContent from "@/components/support-tickets/SupportTicketDetailContent";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireAuthenticatedActor();
  const { id } = await params;

  const ticket = await getSupportTicketDetail(id);
  if (!ticket) notFound();
  if (!canViewTicket(actor, { userId: ticket.userId })) notFound();

  return (
    <SupportTicketDetailContent
      initialTicket={JSON.parse(JSON.stringify(ticket))}
      currentUserId={actor.id}
    />
  );
};

export default Page;
