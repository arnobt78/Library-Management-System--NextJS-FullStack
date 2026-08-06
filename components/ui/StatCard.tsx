/**
 * StatCard — shared admin KPI tile.
 *
 * Parent: CR-0003 / REQ-0034 (Admin Suite Parity Expansion)
 *
 * Every admin page renders a row of these at the top (Wave 4 KPI rollout).
 * `valueLoading` shows a skeleton pulse instead of the value so SSR shells can
 * render instantly while a client query reconciles in the background.
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
}

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  hue?: StatCardHue;
  /** Small secondary badges under the value (e.g. "3 overdue") */
  badges?: StatCardBadge[];
  /** Shows a skeleton in place of the value (first paint / refetch) */
  valueLoading?: boolean;
  /** Shows skeletons in place of badge text */
  badgeValuesLoading?: boolean;
  /** Tighter padding for dense KPI rows (5-6 cards) */
  compact?: boolean;
  className?: string;
}

const BADGE_HUE_CLASS: Record<StatCardHue, string> = {
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
  slate: "bg-slate-100 text-slate-700",
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
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {badgeValuesLoading
              ? badges.map((_, i) => (
                  <Skeleton key={i} className="h-4 w-12 rounded-full" />
                ))
              : badges.map((badge, i) => (
                  <span
                    key={`${badge.label}-${i}`}
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                      BADGE_HUE_CLASS[badge.hue ?? "slate"],
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

/** Responsive grid wrapper shared by every admin page's KPI row.
 * auto-fit fills the row for 4–6 cards (no empty xl:grid-cols-5 track).
 */
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
        "grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
