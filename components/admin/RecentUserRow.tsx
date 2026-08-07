/**
 * Library Overview — recent user row.
 * Inline person (avatar · name · email), no kebab — sky name links to user 360.
 * Primary name font-medium via linkClassName only (global attribution weight unchanged).
 * Parent: REQ-0033 overview row polish
 */
"use client";

import { CalendarCheck2, ShieldCheck } from "lucide-react";
import PersonAttribution from "@/components/PersonAttribution";
import { formatBorrowDateTime } from "@/lib/profile/formatBorrowDates";
import {
  ATTRIBUTION_META_SIZE,
  ATTRIBUTION_META_TONE_LIGHT,
} from "@/lib/ui/attributionStyles";
import { AccountStatusBadge } from "@/lib/ui/semanticBadges";
import { cn } from "@/lib/utils";

import type { OverviewRecentUser } from "@/lib/admin/adminDashboardStatsTypes";

export type { OverviewRecentUser };

export function RecentUserRow({ user }: { user: OverviewRecentUser }) {
  const userHref = `/admin/users/${user.id}`;
  const createdLabel = formatBorrowDateTime(user.createdAt);
  const reviewedLabel = formatBorrowDateTime(user.statusReviewedAt);

  return (
    <div className="flex gap-3 rounded-xl bg-gray-50/90 p-2.5 sm:p-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <PersonAttribution
            person={{
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              universityCard: user.universityCard,
            }}
            href={userHref}
            size={36}
            variant="light"
            layout="inline"
            linkClassName="font-medium"
            className="min-w-0"
          />
          <AccountStatusBadge status={user.status} className="shrink-0" />
        </div>
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-2 gap-y-1",
            ATTRIBUTION_META_SIZE,
            ATTRIBUTION_META_TONE_LIGHT,
          )}
        >
          {createdLabel ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CalendarCheck2 className="size-3" aria-hidden />
              Created {createdLabel}
            </span>
          ) : null}
          {reviewedLabel ? (
            <span className="inline-flex items-center gap-1 text-sky-700">
              <ShieldCheck className="size-3" aria-hidden />
              Reviewed {reviewedLabel}
            </span>
          ) : null}
        </div>
        {user.reviewer ? (
          <PersonAttribution
            person={user.reviewer}
            prefix={
              user.status === "REJECTED"
                ? "Rejected by"
                : user.status === "APPROVED"
                  ? "Approved by"
                  : "Reviewed by"
            }
            href={`/admin/users/${user.reviewer.id}`}
            size={28}
            variant="light"
            layout="inline"
          />
        ) : null}
      </div>
    </div>
  );
}
