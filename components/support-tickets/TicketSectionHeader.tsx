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
  /**
   * center = default — icon tile mid-aligns with title+subtitle (detail DNA).
   * start = icon top-aligned with title only (rare override).
   */
  align = "center",
  className,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  variant?: "light" | "dark";
  iconToneClassName?: string;
  align?: "start" | "center";
  className?: string;
}) {
  const isDark = variant === "dark";
  const rowAlign = align === "center" ? "items-center" : "items-start";
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap justify-between gap-3",
        rowAlign,
        className,
      )}
    >
      <div className={cn("flex min-w-0 gap-3", rowAlign)}>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
            // Lucide glyphs sit optically high in the viewBox — nudge to tile midpoint.
            "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:translate-y-px",
            iconToneClassName ??
              (isDark
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-primary-admin/25 bg-primary-admin/10 text-primary-admin"),
          )}
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0 leading-tight">
          <h2
            className={cn(
              "text-base font-medium leading-tight sm:text-lg",
              isDark ? "text-light-100" : "text-dark-400",
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              className={cn(
                "text-xs leading-snug sm:text-sm",
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
