/**
 * Equal-height KPI card shell — shared by ticket + review admin detail grids.
 * Value mid-aligned; hint footer always reserved for row alignment.
 * Light variant uses shared ADMIN_PANEL_SHELL (REQ-0033 Wave B).
 * Parent: CR-0003 densify detail parity
 */
"use client";

import type { ReactNode } from "react";
import { CARD_PAD_CLASS } from "@/lib/ui/cardPadStyles";
import { ADMIN_PANEL_SHELL } from "@/lib/ui/adminSurfaceStyles";
import { cn } from "@/lib/utils";

export function DetailKpiShell({
  variant,
  icon,
  label,
  children,
  hint,
}: {
  variant: "light" | "dark";
  icon: ReactNode;
  label: string;
  children: ReactNode;
  /** Always pass a string (use &nbsp; / static copy) so footers align across cards */
  hint: string;
}) {
  const isDark = variant === "dark";
  return (
    <div
      className={cn(
        // Grid stretch equalizes card height; pad = CARD_PAD (p-2 sm:p-4)
        "flex h-full flex-col",
        CARD_PAD_CLASS,
        isDark
          ? "rounded-xl border border-white/10 bg-dark-300/80"
          : ADMIN_PANEL_SHELL,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg border",
            isDark
              ? "border-white/15 bg-white/5 text-light-100"
              : "border-gray-200 bg-gray-50 text-gray-600",
          )}
          aria-hidden
        >
          {icon}
        </span>
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-wide",
            isDark ? "text-light-200/70" : "text-gray-500",
          )}
        >
          {label}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 items-center">{children}</div>
      <p
        className={cn(
          "mt-2 line-clamp-2 text-xs leading-normal",
          isDark ? "text-light-200/55" : "text-gray-500",
        )}
      >
        {hint}
      </p>
    </div>
  );
}
