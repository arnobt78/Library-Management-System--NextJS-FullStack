"use client";

/**
 * Shared person line: UserAvatar + Name · email.
 * Profile Link only when `href` is explicitly passed (admin surfaces only —
 * do not auto-link from person.id on student make-admin / profile pages).
 */

import Link from "next/link";
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
  /**
   * Explicit profile href (e.g. `/admin/users/${id}`). Omit on non-admin pages.
   */
  href?: string | null;
  /**
   * Link hover/text — admin light default: text-blue-700 hover:underline.
   */
  linkClassName?: string;
};

export default function PersonAttribution({
  person,
  prefix,
  size = 28,
  className,
  textClassName,
  emptyLabel = "an admin",
  href = null,
  linkClassName = "font-medium text-blue-700 hover:underline",
}: PersonAttributionProps) {
  const linked = Boolean(person && href);
  const labelClass = linked ? undefined : textClassName;

  const identity = person ? (
    <>
      <UserAvatar
        universityCard={person.universityCard}
        fullName={person.fullName}
        email={person.email}
        size={size}
        className="shrink-0 border border-black/10"
      />
      <span className={cn("font-medium", labelClass)}>{person.fullName}</span>
      <span className="opacity-50" aria-hidden>
        ·
      </span>
      <span className={cn("break-all opacity-90", labelClass)}>
        {person.email}
      </span>
    </>
  ) : (
    <span className={cn("font-medium", textClassName)}>{emptyLabel}</span>
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {prefix ? (
        <span className={cn("text-inherit", textClassName)}>{prefix}</span>
      ) : null}
      {linked && href ? (
        <Link
          prefetch={false}
          href={href}
          className={cn(
            "inline-flex flex-wrap items-center gap-2",
            linkClassName,
          )}
        >
          {identity}
        </Link>
      ) : (
        identity
      )}
    </div>
  );
}
