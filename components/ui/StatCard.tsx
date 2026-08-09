/**
 * StatCard — shared admin KPI tile.
 *
 * Parent: CR-0003 / REQ-0034 (Admin Suite Parity Expansion)
 * Wave: REQ-0033 — light glass status badges under the value (semanticBadges rhythm).
 *
 * Every admin page renders a row of these at the top (Wave 4 KPI rollout).
 * `valueLoading` shows a skeleton pulse instead of the value so SSR shells can
 * render instantly while a client query reconciles in the background.
 *
 * KPI chips are text-only (Stockly). `badge.icon` is accepted for type compat
 * but never rendered here — table/list `semanticBadges` keep their icons.
 */
"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type StatCardHue =
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "slate";

export interface StatCardBadge {
  label: string;
  hue?: StatCardHue;
  /**
   * Accepted for call-site parity with semantic badges; StatCard never renders it.
   * Table/list badges use `lib/ui/semanticBadges` instead.
   */
  icon?: LucideIcon;
}

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  hue?: StatCardHue;
  /** Small secondary glass badges under the value (e.g. "3 overdue") */
  badges?: StatCardBadge[];
  /** Shows a skeleton in place of the value (first paint / refetch) */
  valueLoading?: boolean;
  /** Shows skeletons in place of badge text */
  badgeValuesLoading?: boolean;
  /** Tighter padding for dense KPI rows (5-6 cards) */
  compact?: boolean;
  className?: string;
}

/** Light-admin glass chips — border + translucent fill + soft glow (not flat gray-50). */
const BADGE_GLASS_CLASS: Record<StatCardHue, string> = {
  blue: "border-blue-200 bg-blue-50/90 text-blue-700 backdrop-blur-sm shadow-[0_0_12px_rgba(59,130,246,0.12)]",
  emerald:
    "border-emerald-200 bg-emerald-50/90 text-emerald-700 backdrop-blur-sm shadow-[0_0_12px_rgba(16,185,129,0.12)]",
  amber:
    "border-amber-200 bg-amber-50/90 text-amber-700 backdrop-blur-sm shadow-[0_0_12px_rgba(245,158,11,0.12)]",
  rose: "border-rose-200 bg-rose-50/90 text-rose-700 backdrop-blur-sm shadow-[0_0_12px_rgba(244,63,94,0.12)]",
  violet:
    "border-violet-200 bg-violet-50/90 text-violet-700 backdrop-blur-sm shadow-[0_0_12px_rgba(139,92,246,0.12)]",
  slate:
    "border-slate-200/80 bg-slate-50/90 text-slate-600 backdrop-blur-sm shadow-[0_0_10px_rgba(100,116,139,0.08)]",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  hue = "slate",
  badges,
  valueLoading,
  badgeValuesLoading,
  compact,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "kpi-card",
        `kpi-card--${hue}`,
        compact && "p-3 sm:p-3.5",
        className,
      )}
    >
      <div className="kpi-card__icon">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="kpi-card__title truncate">{title}</p>
        {valueLoading ? (
          <Skeleton className="mt-1 h-6 w-14" />
        ) : (
          <p className="kpi-card__value leading-tight">{value}</p>
        )}
        {badges && badges.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {badgeValuesLoading
              ? badges.map((_, i) => (
                  <Skeleton key={i} className="h-5 w-14 rounded-md" />
                ))
              : badges.map((badge, i) => (
                  <span
                    key={`${badge.label}-${i}`}
                    className={cn(
                      "inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none",
                      BADGE_GLASS_CLASS[badge.hue ?? "slate"],
                    )}
                  >
                    {badge.label}
                  </span>
                ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Stockly-style 3-per-row KPI grid (5 cards → 3+2, 6 cards → 3+3). */
export function StatCardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
