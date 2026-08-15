/**
 * Admin Support Ticket Detail Page (`/admin/support-tickets/[id]`).
 * Passes SSR currentAdmin (DB universityCard) for Activity densify — no Robohash bounce.
 * Missing ticket → redirect to list (not notFound) so hard-delete SA/RSC remount
 * never paints black/custom 404 before client soft-nav.
 * Parent: CR-0003 / REQ-0034; Activity avatar densify fix
 */
import React from "react";
import { redirect } from "next/navigation";
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

  if (!ticket) {
    redirect("/admin/support-tickets");
  }
  const currentAdmin = {
    id: actor.id,
    fullName: actor.name,
    email: actor.email,
    universityCard: actor.universityCard ?? null,
  };

  return (
    <AdminSupportTicketDetailContent
      initialTicket={JSON.parse(JSON.stringify(ticket))}
      assignableAdmins={JSON.parse(JSON.stringify(assignableAdmins))}
      initialAuditEvents={JSON.parse(JSON.stringify(auditEvents))}
      currentUserId={actor.id}
      currentAdmin={currentAdmin}
    />
  );
};

export default Page;
