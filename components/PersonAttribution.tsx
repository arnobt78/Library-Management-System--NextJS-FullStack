"use client";

/**
 * Shared person line: UserAvatar + Name · email (+ copy).
 * Profile Link only when `href` is explicitly passed (admin surfaces only —
 * do not auto-link from person.id on student make-admin / profile pages).
 */

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
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
   * Extra classes on the name control (defaults: sky name, no underline).
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
  linkClassName,
}: PersonAttributionProps) {
  const [copied, setCopied] = useState(false);
  const linked = Boolean(person && href);

  const copyEmail = async () => {
    if (!person?.email) return;
    try {
      await navigator.clipboard.writeText(person.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be denied; keep email visible without toast noise.
    }
  };

  // Name: sky-600 resting, sky-500 hover, never underline (admin + student).
  const nameClass = cn(
    "font-medium text-sky-600 transition-colors hover:text-sky-500",
    linkClassName,
  );

  const identity = person ? (
    <>
      <UserAvatar
        universityCard={person.universityCard}
        fullName={person.fullName}
        email={person.email}
        size={size}
        className="shrink-0 border border-black/10"
      />
      {linked && href ? (
        <Link prefetch={false} href={href} className={nameClass}>
          {person.fullName}
        </Link>
      ) : (
        <span className={nameClass}>{person.fullName}</span>
      )}
      <span className="text-muted-foreground opacity-50" aria-hidden>
        ·
      </span>
      <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-muted-foreground">
        <span className="break-all">{person.email}</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void copyEmail();
          }}
          className="inline-flex shrink-0 items-center justify-center rounded p-0.5 text-muted-foreground transition-colors hover:text-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          aria-label={copied ? "Email copied" : `Copy ${person.email}`}
          title={copied ? "Copied" : "Copy email"}
        >
          {copied ? (
            <Check className="size-3.5 text-green-500" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
        </button>
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
      {identity}
    </div>
  );
}
