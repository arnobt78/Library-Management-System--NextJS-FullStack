"use client";

/**
 * Shared person line: UserAvatar + name + copyable email.
 * Stack layout matches AuthForm test-account Select (size 36, items-center, gap-2).
 * - layout="stack" (default): avatar | name / email — tables + detail densify
 * - layout="inline": avatar · name · email on one wrapping row (attribution strips)
 * Profile Link only when `href` is explicitly passed (admin surfaces only).
 */

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { SKY_LINK_DARK, SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { cn } from "@/lib/utils";

export type PersonAttributionPerson = AdminRequestReviewer;

type PersonAttributionProps = {
  person: PersonAttributionPerson | null | undefined;
  /** Prefix text before avatar/name (e.g. "Rejected by", "Approved by"). */
  prefix?: string;
  /** Default 36 — login / AuthForm Select parity */
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
  /**
   * stack = two lines beside avatar (tables); inline = single wrapping row.
   */
  layout?: "stack" | "inline";
  /** Email line tone for dark glass tables */
  variant?: "light" | "dark";
};

export default function PersonAttribution({
  person,
  prefix,
  size = 36,
  className,
  textClassName,
  emptyLabel = "an admin",
  href = null,
  linkClassName,
  layout = "stack",
  variant = "light",
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

  // Admin light: sky-700 (readable on white). Dark glass: sky-400 → hover-300.
  const nameClass = cn(
    "font-medium",
    variant === "dark" ? SKY_LINK_DARK : SKY_LINK_LIGHT,
    linkClassName,
  );

  const emailTone =
    variant === "dark" ? "text-light-200/70" : "text-muted-foreground";

  const copyBtn = person?.email ? (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void copyEmail();
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
        emailTone,
        "hover:text-sky-500",
      )}
      aria-label={copied ? "Email copied" : `Copy ${person.email}`}
      title={copied ? "Copied" : "Copy email"}
    >
      {copied ? (
        <Check className="size-3.5 text-green-500" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </button>
  ) : null;

  if (!person) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {prefix ? (
          <span className={cn("text-inherit", textClassName)}>{prefix}</span>
        ) : null}
        <span className={cn("font-medium", textClassName)}>{emptyLabel}</span>
      </div>
    );
  }

  const nameEl =
    linked && href ? (
      <Link prefetch={false} href={href} className={cn("truncate", nameClass)}>
        {person.fullName}
      </Link>
    ) : (
      <span className={cn("truncate", nameClass)}>{person.fullName}</span>
    );

  const avatar = (
    <UserAvatar
      universityCard={person.universityCard}
      fullName={person.fullName}
      email={person.email}
      size={size}
      className="shrink-0 border border-black/10"
    />
  );

  if (layout === "stack") {
    // AuthForm parity: items-center so the 2-line text block centers vs the circle
    return (
      <div
        className={cn(
          "inline-flex min-w-0 max-w-full items-center gap-2",
          className,
        )}
      >
        {prefix ? (
          <span className={cn("shrink-0 text-inherit", textClassName)}>
            {prefix}
          </span>
        ) : null}
        {avatar}
        {/* Stock-inventory parity: tight flex-col, leading-none (no name↔email gap) */}
        <div className="flex min-w-0 flex-1 flex-col leading-none">
          <div className="truncate text-sm font-medium leading-none">
            {nameEl}
          </div>
          {person.email ? (
            <div
              className={cn(
                "inline-flex min-w-0 max-w-full items-center gap-1 text-xs leading-none",
                emailTone,
              )}
            >
              <span className="truncate">{person.email}</span>
              {copyBtn}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {prefix ? (
        <span className={cn("text-inherit", textClassName)}>{prefix}</span>
      ) : null}
      {avatar}
      {nameEl}
      <span className="text-muted-foreground opacity-50" aria-hidden>
        ·
      </span>
      <span
        className={cn(
          "inline-flex min-w-0 max-w-full items-center gap-1",
          emailTone,
        )}
      >
        <span className="break-all">{person.email}</span>
        {copyBtn}
      </span>
    </div>
  );
}
