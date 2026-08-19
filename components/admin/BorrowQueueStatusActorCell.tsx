"use client";

/**
 * Borrow Queue Status & Issuer cell — Reviews / Sign-up Decision DNA.
 * PENDING: badge + Requested; CANCELLED/BORROWED/RETURNED: DecisionActorStack
 * with issuer (or Self-returned / Self-cancelled) + decision date + optional Due.
 * Parent: AdminBookRequestsList
 */

import { Clock } from "lucide-react";
import { DecisionActorStack } from "@/components/admin/DecisionActorStack";
import { DecisionDateMeta } from "@/components/support-tickets/DecisionDateMeta";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import { BorrowStatusBadge } from "@/lib/ui/semanticBadges";
import { formatMediumDate } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";

/** Due line under Approved/Returned — BorrowLifecycleDates violet Clock DNA. */
function BorrowDueMeta({ dueDate }: { dueDate?: string | Date | null }) {
  const text = formatMediumDate(dueDate);
  if (!dueDate || text === "—") return null;
  return (
    <span
      className={cn(
        "inline-flex w-max max-w-none shrink-0 items-center gap-1 whitespace-nowrap text-xs text-violet-700",
      )}
    >
      <Clock className="size-3 shrink-0 text-violet-600" aria-hidden />
      <span className="font-medium">Due:</span>
      <span className="text-gray-700">{text}</span>
    </span>
  );
}

function isSelfReturned(r: BorrowRecordWithDetails): boolean {
  if (r.returnedByActor?.id && r.returnedByActor.id === r.userId) return true;
  const byEmail = r.returnedBy?.trim().toLowerCase();
  const userEmail = r.userEmail?.trim().toLowerCase();
  return Boolean(byEmail && userEmail && byEmail === userEmail);
}

/** Owner soft-cancel — updatedBy / cancelledByActor is the borrower. */
function isSelfCancelled(r: BorrowRecordWithDetails): boolean {
  if (r.cancelledByActor?.id && r.cancelledByActor.id === r.userId) return true;
  const byEmail = r.updatedBy?.trim().toLowerCase();
  const userEmail = r.userEmail?.trim().toLowerCase();
  return Boolean(byEmail && userEmail && byEmail === userEmail);
}

export function BorrowQueueStatusActorCell({
  request,
}: {
  request: BorrowRecordWithDetails;
}) {
  const r = request;
  const requestedAt = r.createdAt ?? r.borrowDate;

  if (r.status === "PENDING") {
    return (
      <div className="flex min-w-0 flex-col items-start gap-1 leading-none">
        <BorrowStatusBadge status="PENDING" />
        <TicketDateMeta
          createdAt={requestedAt}
          createdLabel="Requested"
          hideUpdated
        />
      </div>
    );
  }

  if (r.status === "CANCELLED") {
    const self = isSelfCancelled(r);
    const actor = self ? null : r.cancelledByActor;
    const hasActor = Boolean(actor?.fullName || actor?.email);

    if (self) {
      return (
        <DecisionActorStack
          status="CANCELLED"
          badge={<BorrowStatusBadge status="CANCELLED" />}
          actorLabel="Self-cancelled"
          actorLabelClassName="text-rose-700"
          decidedAt={r.cancelledAt ?? r.updatedAt}
          showActor
        />
      );
    }

    if (!hasActor) {
      return (
        <div className="flex min-w-0 flex-col items-start gap-1 leading-none">
          <BorrowStatusBadge status="CANCELLED" />
          <DecisionDateMeta status="CANCELLED" at={r.cancelledAt ?? r.updatedAt} />
        </div>
      );
    }

    return (
      <DecisionActorStack
        status="CANCELLED"
        badge={<BorrowStatusBadge status="CANCELLED" />}
        actor={{
          id: actor!.id,
          fullName: actor!.fullName,
          email: actor!.email,
          universityCard: actor!.universityCard,
        }}
        actorHref={actor!.id ? `/admin/users/${actor!.id}` : null}
        decidedAt={r.cancelledAt ?? r.updatedAt}
        showActor
      />
    );
  }

  if (r.status === "BORROWED") {
    const actor = r.approvedByActor;
    return (
      <DecisionActorStack
        status="BORROWED"
        badge={<BorrowStatusBadge status="BORROWED" />}
        actor={
          actor
            ? {
                id: actor.id,
                fullName: actor.fullName,
                email: actor.email,
                universityCard: actor.universityCard,
              }
            : null
        }
        actorHref={actor?.id ? `/admin/users/${actor.id}` : null}
        decidedAt={r.approvedAt}
        decisionLabel="Approved:"
        showActor={Boolean(actor?.fullName || actor?.email)}
        extraMeta={<BorrowDueMeta dueDate={r.dueDate} />}
      />
    );
  }

  if (r.status === "RETURNED") {
    const self = isSelfReturned(r);
    const actor = self ? null : (r.returnedByActor ?? r.approvedByActor);
    return (
      <DecisionActorStack
        status="RETURNED"
        badge={<BorrowStatusBadge status="RETURNED" />}
        actor={
          actor
            ? {
                id: actor.id,
                fullName: actor.fullName,
                email: actor.email,
                universityCard: actor.universityCard,
              }
            : null
        }
        actorHref={actor?.id ? `/admin/users/${actor.id}` : null}
        actorLabel={self ? "Self-returned" : undefined}
        actorLabelClassName={self ? "text-emerald-700" : undefined}
        decidedAt={r.returnDate ?? r.updatedAt}
        showActor={self || Boolean(actor?.fullName || actor?.email)}
        extraMeta={<BorrowDueMeta dueDate={r.dueDate} />}
      />
    );
  }

  return (
    <span className="inline-flex self-start">
      <BorrowStatusBadge status={r.status} />
    </span>
  );
}
