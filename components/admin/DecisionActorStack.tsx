"use client";

/**
 * Shared Decision & Actor table cell — status badge · by · PersonAttribution · DecisionDateMeta.
 * Optional badgeHref (PrefetchLink) keeps queue detail access after merging Decision into Actor.
 * extraMeta — secondary lines (e.g. Due:) under decision date.
 * actorLabel — text actor when no person (e.g. Self-returned).
 * Parent: Users Status, Sign-up Recent, Admin Requests Recent, Borrow Queue.
 */

import type { ReactNode } from "react";
import { XCircle } from "lucide-react";
import PersonAttribution, {
  type PersonAttributionPerson,
} from "@/components/PersonAttribution";
import PrefetchLink from "@/components/PrefetchLink";
import { DecisionDateMeta } from "@/components/support-tickets/DecisionDateMeta";
import { Badge } from "@/components/ui/badge";
import { AccountStatusBadge } from "@/lib/ui/semanticBadges";
import { decisionActorByTone } from "@/lib/ui/attributionStyles";
import { cn } from "@/lib/utils";

function WithdrawnDecisionBadge() {
  return (
    <Badge
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium leading-none",
        "border-slate-200/80 bg-slate-50/90 text-slate-600 shadow-sm backdrop-blur-sm",
      )}
    >
      <XCircle className="size-3" aria-hidden />
      Withdrawn
    </Badge>
  );
}

export function DecisionActorStack({
  status,
  actor,
  actorHref = null,
  decidedAt,
  badgeHref = null,
  /** Make-admin cancel — Withdrawn badge, slate “by”, no DecisionDateMeta. */
  withdrawn = false,
  /** When false, only badge (+ optional date if decided). */
  showActor = true,
  /** Override default AccountStatusBadge / Withdrawn badge. */
  badge,
  /** Override DecisionDateMeta label (e.g. Approved: under Borrowed badge). */
  decisionLabel,
  /** Extra lines under DecisionDateMeta (e.g. Due:). */
  extraMeta,
  /** Text actor when no person row (e.g. Self-returned / Self-cancelled). */
  actorLabel,
  /** Tone for actorLabel (emerald Self-returned / rose Self-cancelled). */
  actorLabelClassName,
}: {
  status: string;
  actor?: PersonAttributionPerson | null;
  actorHref?: string | null;
  decidedAt?: string | Date | null;
  badgeHref?: string | null;
  withdrawn?: boolean;
  showActor?: boolean;
  badge?: ReactNode;
  decisionLabel?: string;
  extraMeta?: ReactNode;
  actorLabel?: string;
  actorLabelClassName?: string;
}) {
  const decided =
    status === "APPROVED" ||
    status === "REJECTED" ||
    status === "BORROWED" ||
    status === "RETURNED" ||
    status === "CANCELLED";
  const byTone = decisionActorByTone(status, { withdrawn });
  const badgeNode =
    badge ??
    (withdrawn ? (
      <WithdrawnDecisionBadge />
    ) : (
      <AccountStatusBadge status={status} />
    ));

  const linkedBadge = badgeHref ? (
    <PrefetchLink
      href={badgeHref}
      prefetch={false}
      className="inline-flex hover:opacity-90"
      onClick={(e) => e.stopPropagation()}
    >
      {badgeNode}
    </PrefetchLink>
  ) : (
    <span className="inline-flex">{badgeNode}</span>
  );

  const dateMeta =
    !withdrawn && decided ? (
      <div className="flex min-w-0 flex-col gap-0.5 leading-none">
        <DecisionDateMeta
          status={status}
          at={decidedAt}
          label={decisionLabel}
        />
        {extraMeta}
      </div>
    ) : null;

  const hasPerson = Boolean(actor?.fullName || actor?.email);
  const showBy = showActor && (hasPerson || Boolean(actorLabel));

  return (
    <div
      className="flex min-w-0 flex-col gap-1 leading-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="inline-flex items-center gap-1.5">
        {linkedBadge}
        {showBy ? (
          <span className={`text-xs font-medium ${byTone}`}>by</span>
        ) : null}
      </div>
      {showActor && hasPerson ? (
        <PersonAttribution
          layout="stack"
          size={28}
          href={actorHref}
          person={actor}
          meta={dateMeta}
        />
      ) : showActor && actorLabel ? (
        <div className="flex min-w-0 flex-col gap-0.5 leading-none">
          <p
            className={cn(
              "text-xs font-medium",
              actorLabelClassName ?? "text-gray-900",
            )}
          >
            {actorLabel}
          </p>
          {dateMeta}
        </div>
      ) : decided && !withdrawn ? (
        dateMeta
      ) : null}
    </div>
  );
}
