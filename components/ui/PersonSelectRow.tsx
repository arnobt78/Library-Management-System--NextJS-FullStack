/**
 * Avatar + stacked name/email for SelectItem / SelectValue — login Test Account parity.
 * size 36 + items-center + gap-2 (AuthForm pattern). Parent: CR-0003 / REQ-0034
 */
"use client";

import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

export type PersonSelectRowProps = {
  fullName: string;
  email: string;
  universityCard?: string | null;
  /** Default 36 — matches AuthForm test-account Select */
  size?: number;
  className?: string;
  /** Muted email on dark glass selects */
  variant?: "light" | "dark";
};

export function PersonSelectRow({
  fullName,
  email,
  universityCard = null,
  size = 36,
  className,
  variant = "light",
}: PersonSelectRowProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2 text-left",
        className,
      )}
    >
      <UserAvatar
        universityCard={universityCard}
        fullName={fullName}
        email={email}
        size={size}
        className="shrink-0 border border-black/10"
      />
      {/* Tight stack — matches PersonAttribution / stock PersonNameEmailCell */}
      <span className="flex min-w-0 flex-1 flex-col leading-none">
        <span
          className={cn(
            "block truncate text-sm font-medium leading-none",
            variant === "dark" ? "text-light-100" : "text-foreground",
          )}
        >
          {fullName}
        </span>
        <span
          className={cn(
            "block truncate text-xs leading-none",
            variant === "dark" ? "text-light-200/70" : "text-muted-foreground",
          )}
        >
          {email}
        </span>
      </span>
    </span>
  );
}
