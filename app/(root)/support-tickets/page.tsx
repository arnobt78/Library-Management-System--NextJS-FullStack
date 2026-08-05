/**
 * My Support Tickets — personal hub, reachable by any signed-in user
 * (including admin-as-user via the profile dropdown). Lives under (root)
 * for the shared Header/Footer/page-shell. Parent: CR-0003 / REQ-0034
 *
 * Ticket eligibility matches borrowing/reviewing: APPROVED accounts only.
 * PENDING/REJECTED accounts see the same locked-panel UX as /make-admin and
 * /my-profile instead of a hard error.
 */
import React from "react";
import { requireSignedInActor } from "@/lib/auth/authorization";
import { getUserSupportTickets } from "@/lib/server/supportTicketData";
import AccountRegistrationNotice from "@/components/AccountRegistrationNotice";
import SupportTicketsPageContent from "@/components/support-tickets/SupportTicketsPageContent";

export const runtime = "nodejs";

const Page = async () => {
  const actor = await requireSignedInActor();

  if (actor.status !== "APPROVED") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <AccountRegistrationNotice
          accountStatus={actor.status}
          context="support-tickets"
          email={actor.email}
        />
      </div>
    );
  }

  const initialTickets = await getUserSupportTickets(actor.id);

  return (
    <SupportTicketsPageContent
      currentUserId={actor.id}
      initialTickets={JSON.parse(JSON.stringify(initialTickets))}
    />
  );
};

export default Page;
