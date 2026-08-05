/**
 * Admin Support Ticket Detail Page (`/admin/support-tickets/[id]`).
 * Parent: CR-0003 / REQ-0034
 */
import React from "react";
import { notFound } from "next/navigation";
import { requireAdminActor } from "@/lib/auth/authorization";
import {
  getAssignableAdmins,
  getSupportTicketDetail,
  getTicketAuditEvents,
} from "@/lib/server/supportTicketData";
import AdminSupportTicketDetailContent from "@/components/admin/AdminSupportTicketDetailContent";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireAdminActor();
  const { id } = await params;

  const [ticket, assignableAdmins, auditEvents] = await Promise.all([
    getSupportTicketDetail(id),
    getAssignableAdmins(),
    getTicketAuditEvents(id),
  ]);

  if (!ticket) notFound();

  return (
    <AdminSupportTicketDetailContent
      initialTicket={JSON.parse(JSON.stringify(ticket))}
      assignableAdmins={JSON.parse(JSON.stringify(assignableAdmins))}
      initialAuditEvents={JSON.parse(JSON.stringify(auditEvents))}
      currentUserId={actor.id}
    />
  );
};

export default Page;
