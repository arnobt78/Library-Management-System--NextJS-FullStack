"use client";

/**
 * Shared person line: UserAvatar + Name · email.
 * Used for signup/make-admin applicants and reviewers (no parentheses email).
 */

import UserAvatar from "@/components/UserAvatar";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { cn } from "@/lib/utils";

export type PersonAttributionPerson = AdminRequestReviewer;

type PersonAttributionProps = {
  person: PersonAttributionPerson | null | undefined;
  /** Prefix text before avatar/name (e.g. "Rejected by", "Approved by"). */
  prefix?: string;
  size?: number;
  className?: string;
  textClassName?: string;
  /** Fallback when person is null (reviewer unknown). */
  emptyLabel?: string;
};

export default function PersonAttribution({
  person,
  prefix,
  size = 28,
  className,
  textClassName,
  emptyLabel = "an admin",
}: PersonAttributionProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {prefix ? (
        <span className={cn("text-inherit", textClassName)}>{prefix}</span>
      ) : null}
      {person ? (
        <>
          <UserAvatar
            universityCard={person.universityCard}
            fullName={person.fullName}
            email={person.email}
            size={size}
            className="shrink-0 border border-black/10"
          />
          <span className={cn("font-medium", textClassName)}>
            {person.fullName}
          </span>
          <span className="opacity-50" aria-hidden>
            ·
          </span>
          <span className={cn("break-all opacity-90", textClassName)}>
            {person.email}
          </span>
        </>
      ) : (
        <span className={cn("font-medium", textClassName)}>{emptyLabel}</span>
      )}
    </div>
  );
}
