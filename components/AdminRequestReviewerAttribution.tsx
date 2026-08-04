"use client";

/**
 * Compact reviewer line for admin-request decisions:
 * UserAvatar + Name · email, or fallback “an admin” when join is null.
 */

import UserAvatar from "@/components/UserAvatar";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { cn } from "@/lib/utils";

type AdminRequestReviewerAttributionProps = {
  reviewer: AdminRequestReviewer | null | undefined;
  /** Prefix text before avatar/name (e.g. "Rejected by", "Reviewed by"). */
  prefix?: string;
  size?: number;
  className?: string;
  textClassName?: string;
};

export default function AdminRequestReviewerAttribution({
  reviewer,
  prefix,
  size = 28,
  className,
  textClassName,
}: AdminRequestReviewerAttributionProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {prefix ? (
        <span className={cn("text-inherit", textClassName)}>{prefix}</span>
      ) : null}
      {reviewer ? (
        <>
          <UserAvatar
            universityCard={reviewer.universityCard}
            fullName={reviewer.fullName}
            email={reviewer.email}
            size={size}
            className="shrink-0 border border-white/20"
          />
          <span className={cn("font-medium", textClassName)}>
            {reviewer.fullName}
          </span>
          <span className="opacity-50" aria-hidden>
            ·
          </span>
          <span className={cn("break-all opacity-90", textClassName)}>
            {reviewer.email}
          </span>
        </>
      ) : (
        <span className={cn("font-medium", textClassName)}>an admin</span>
      )}
    </div>
  );
}
