/**
 * Subject link + truncated description (+ optional Created/Updated) for ticket lists.
 * Dates live under the subject so narrow (14") screens can drop a Date column.
 * PrefetchLink warms ticket detail before soft-nav.
 * Parent: CR-0003 / REQ-0034 — list densify UI
 */
"use client";

import PrefetchLink from "@/components/PrefetchLink";
import { TicketCreatedUpdatedCell } from "@/components/support-tickets/TicketCreatedUpdatedCell";
import { SKY_LINK_DARK, SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { TABLE_CELL_TITLE } from "@/lib/ui/tableCellStyles";
import { cn } from "@/lib/utils";

export function TicketSubjectCell({
  href,
  subject,
  description,
  variant = "light",
  createdAt,
  updatedAt,
  showDates = false,
}: {
  href: string;
  subject: string;
  description?: string | null;
  /** light = admin sky link; dark = user glass primary/light link */
  variant?: "light" | "dark";
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  /** When true, append Created/Updated under description (replaces Date column). */
  showDates?: boolean;
}) {
  return (
    <div className="flex min-w-0 max-w-[320px] flex-col gap-1">
      <PrefetchLink
        href={href}
        prefetch={false}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          TABLE_CELL_TITLE,
          "line-clamp-1",
          variant === "dark" ? SKY_LINK_DARK : SKY_LINK_LIGHT,
        )}
      >
        {subject}
      </PrefetchLink>
      {description?.trim() ? (
        <p
          className={cn(
            "line-clamp-1 text-xs",
            variant === "dark" ? "text-light-200/80" : "text-gray-500",
          )}
        >
          {description.trim()}
        </p>
      ) : null}
      {showDates ? (
        <TicketCreatedUpdatedCell
          variant={variant}
          createdAt={createdAt}
          updatedAt={updatedAt}
        />
      ) : null}
    </div>
  );
}
