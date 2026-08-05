/**
 * Admin Support Tickets Page (`/admin/support-tickets`).
 * Parent: CR-0003 / REQ-0034
 *
 * SSR-fetches every ticket so the KPI row + table paint instantly; client
 * filters refetch through TanStack Query against `/api/support-tickets`.
 */
import React from "react";
import { requireAdminActor } from "@/lib/auth/authorization";
import { getAdminSupportTickets, getAssignableAdmins } from "@/lib/server/supportTicketData";
import SupportTicketList from "@/components/admin/SupportTicketList";

export const runtime = "nodejs";

const Page = async () => {
  await requireAdminActor();
  const [initialTickets, assignableAdmins] = await Promise.all([
    getAdminSupportTickets(),
    getAssignableAdmins(),
  ]);

  return (
    <SupportTicketList
      initialTickets={JSON.parse(JSON.stringify(initialTickets))}
      assignableAdmins={JSON.parse(JSON.stringify(assignableAdmins))}
    />
  );
};

export default Page;
