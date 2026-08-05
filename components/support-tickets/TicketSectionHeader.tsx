/**
 * Section chrome for ticket detail — bordered icon tile + title/subtitle (+ trailing).
 * Used by Conversation, Internal Notes, Activity (light admin + dark user).
 * Parent: CR-0003 / REQ-0034
 */
"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TicketSectionHeader({
  icon,
  title,
  subtitle,
  trailing,
  variant = "light",
  /** Override icon tile colors (e.g. teal for Internal Notes). */
  iconToneClassName,
  className,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  variant?: "light" | "dark";
  iconToneClassName?: string;
  className?: string;
}) {
  const isDark = variant === "dark";
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
            iconToneClassName ??
              (isDark
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-primary-admin/25 bg-primary-admin/10 text-primary-admin"),
          )}
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h2
            className={cn(
              "text-base font-semibold sm:text-lg",
              isDark ? "text-light-100" : "text-dark-400",
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              className={cn(
                "text-xs sm:text-sm",
                isDark ? "text-light-200/70" : "text-gray-500",
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {trailing ? <div className="shrink-0 self-center">{trailing}</div> : null}
    </div>
  );
}
