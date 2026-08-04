"use client";

/**
 * Compact reviewer line for admin-request / signup decisions.
 * Thin wrapper around PersonAttribution (avatar + Name · email).
 */

import PersonAttribution from "@/components/PersonAttribution";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";

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
    <PersonAttribution
      person={reviewer}
      prefix={prefix}
      size={size}
      className={className}
      textClassName={textClassName}
      emptyLabel="an admin"
    />
  );
}
