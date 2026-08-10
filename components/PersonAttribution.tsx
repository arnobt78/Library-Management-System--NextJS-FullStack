"use client";

/**
 * Shared person line: UserAvatar + name + copyable email.
 * Stack layout matches AuthForm test-account Select (size 36, items-center, gap-2).
 * - layout="stack" (default): avatar | name / email; optional meta full-width under avatar
 * - layout="inline": avatar · name · email on one wrapping row (attribution strips)
 * `meta` = Joined / decision date under the circle (leftmost — saves column width).
 * Profile Link only when `href` is explicitly passed (admin surfaces only).
 * Sky link colors apply only when linked; static names use attributionStyles.
 */

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import PrefetchLink from "@/components/PrefetchLink";
import UserAvatar from "@/components/UserAvatar";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import {
  ATTRIBUTION_EMAIL_SIZE,
  ATTRIBUTION_EMAIL_TONE,
  ATTRIBUTION_META_SIZE,
  ATTRIBUTION_META_TONE_DARK,
  ATTRIBUTION_META_TONE_LIGHT,
  ATTRIBUTION_NAME_STATIC_DARK,
  ATTRIBUTION_NAME_STATIC_LIGHT,
  ATTRIBUTION_NAME_WEIGHT,
  ATTRIBUTION_PERSON_SIZE,
} from "@/lib/ui/attributionStyles";
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
  /**
   * Optional override for prefix (status-tinted cards / larger make-admin body).
   * When omitted, prefix matches ReviewDateMeta chip tone + size.
   */
  textClassName?: string;
  /** Fallback when person is null (reviewer unknown). */
  emptyLabel?: string;
  /**
   * Explicit profile href (e.g. `/admin/users/${id}`). Omit on non-admin pages.
   */
  href?: string | null;
  /**
   * Extra classes on the name control.
   */
  linkClassName?: string;
  /**
   * stack = two lines beside avatar (tables); inline = single wrapping row.
   */
  layout?: "stack" | "inline";
  /** Email / name tone for dark glass vs light admin panels */
  variant?: "light" | "dark";
  /**
   * Stack-only: Joined / Approved date under avatar (leftmost, not name-aligned).
   */
  meta?: ReactNode;
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
  meta,
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

  // Linked → sky affordance; static → no sky-link look (REQ-0033 polish).
  // Names are font-normal; table headers keep font-medium centrally.
  const nameClass = cn(
    ATTRIBUTION_NAME_WEIGHT,
    ATTRIBUTION_PERSON_SIZE,
    linked
      ? variant === "dark"
        ? SKY_LINK_DARK
        : SKY_LINK_LIGHT
      : variant === "dark"
        ? ATTRIBUTION_NAME_STATIC_DARK
        : ATTRIBUTION_NAME_STATIC_LIGHT,
    linkClassName,
  );

  // Email + copy icon always muted-foreground (matches · separator; both variants).
  const emailTone = ATTRIBUTION_EMAIL_TONE;
  const emailSize = ATTRIBUTION_EMAIL_SIZE;

  const prefixClass = cn(
    "shrink-0",
    textClassName ??
      cn(
        ATTRIBUTION_META_SIZE,
        variant === "dark"
          ? ATTRIBUTION_META_TONE_DARK
          : ATTRIBUTION_META_TONE_LIGHT,
      ),
  );

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
        {prefix ? <span className={prefixClass}>{prefix}</span> : null}
        <span className={cn(ATTRIBUTION_NAME_WEIGHT, ATTRIBUTION_PERSON_SIZE, textClassName)}>
          {emptyLabel}
        </span>
      </div>
    );
  }

  const nameEl =
    linked && href ? (
      <PrefetchLink prefetch={false} href={href} className={cn("truncate", nameClass)}>
        {person.fullName}
      </PrefetchLink>
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
    // Outer gap-1 = email row → Joined/Approved only; name↔email stay flush.
    return (
      <div
        className={cn(
          "flex min-w-0 max-w-full flex-col gap-1 leading-none",
          className,
        )}
      >
        <div className="inline-flex min-w-0 max-w-full items-center gap-2">
          {prefix ? <span className={prefixClass}>{prefix}</span> : null}
          {avatar}
          <div className="flex min-w-0 flex-1 flex-col leading-none">
            <div
              className={cn(
                "truncate leading-none",
                ATTRIBUTION_NAME_WEIGHT,
                ATTRIBUTION_PERSON_SIZE,
              )}
            >
              {nameEl}
            </div>
            {person.email ? (
              <div
                className={cn(
                  "inline-flex min-w-0 max-w-full items-center gap-1 leading-none",
                  emailSize,
                  emailTone,
                )}
              >
                <span className="truncate">{person.email}</span>
                {copyBtn}
              </div>
            ) : null}
          </div>
        </div>
        {meta}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {prefix ? <span className={prefixClass}>{prefix}</span> : null}
      {avatar}
      {nameEl}
      <span className="text-muted-foreground opacity-50" aria-hidden>
        ·
      </span>
      <span
        className={cn(
          "inline-flex min-w-0 max-w-full items-center gap-1",
          emailSize,
          emailTone,
        )}
      >
        <span className="break-all">{person.email}</span>
        {copyBtn}
      </span>
    </div>
  );
}
