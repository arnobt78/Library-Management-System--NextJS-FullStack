/**
 * Reusable admin white panel — borderless shadow shell + CARD_PAD.
 * Prefer this (or `.admin-panel`) for overview cards and list chrome.
 * Do not put `btn-ripple` on this host.
 * Parent: REQ-0033 admin glass polish
 */

import type { ReactNode } from "react";
import {
  ADMIN_PANEL_CLASS,
  ADMIN_PANEL_TOP_STROKE,
  ADMIN_STAT_CARD_CLASS,
} from "@/lib/ui/adminSurfaceStyles";
import { cn } from "@/lib/utils";

export function AdminSurfacePanel({
  children,
  className,
  /** flex-1 + space-y for overview chart/stat rows */
  variant = "panel",
  /** Subtle sky→violet top accent (non-KPI analytics) */
  topStroke = false,
}: {
  children: ReactNode;
  className?: string;
  variant?: "panel" | "stat";
  topStroke?: boolean;
}) {
  return (
    <div
      className={cn(
        variant === "stat" ? ADMIN_STAT_CARD_CLASS : ADMIN_PANEL_CLASS,
        topStroke && ADMIN_PANEL_TOP_STROKE,
        className,
      )}
    >
      {children}
    </div>
  );
}
