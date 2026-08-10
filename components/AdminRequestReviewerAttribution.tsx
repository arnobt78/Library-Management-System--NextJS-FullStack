"use client";

/**
 * Compact reviewer line for admin-request / signup decisions.
 * Thin wrapper around PersonAttribution (avatar + Name · email + optional profile link).
 * Pass meta (DecisionDateMeta) for stack under-email date; forces layout="stack".
 * Pass variant="dark" on root/profile glass; default light for admin white panels.
 */

import type { ReactNode } from "react";
import PersonAttribution from "@/components/PersonAttribution";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";

type AdminRequestReviewerAttributionProps = {
  reviewer: AdminRequestReviewer | null | undefined;
  /** Prefix text before avatar/name (e.g. "Rejected by", "Reviewed by"). */
  prefix?: string;
  size?: number;
  className?: string;
  textClassName?: string;
  /** Explicit /admin/users/[id] — admin surfaces only. */
  href?: string | null;
  linkClassName?: string;
  /** dark = root/profile glass; light = admin white (default). */
  variant?: "light" | "dark";
  /** DecisionDateMeta under email — switches to stack layout. */
  meta?: ReactNode;
};

export default function AdminRequestReviewerAttribution({
  reviewer,
  prefix,
  size = 28,
  className,
  textClassName,
  href = null,
  linkClassName,
  variant = "light",
  meta,
}: AdminRequestReviewerAttributionProps) {
  return (
    <PersonAttribution
      person={reviewer}
      prefix={prefix}
      size={size}
      className={className}
      textClassName={textClassName}
      emptyLabel="an admin"
      href={href}
      linkClassName={linkClassName}
      layout={meta ? "stack" : "inline"}
      variant={variant}
      meta={meta}
    />
  );
}
