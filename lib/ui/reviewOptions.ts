/**
 * Single source of truth for Book Review moderation status labels + iconized
 * FilterSelect options. Mirrors `lib/ui/ticketOptions.ts` so badge labels and
 * the admin filter Select stay in lockstep.
 * Parent: CR-0003 / REQ-0035 polish
 */

import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock, List, XCircle } from "lucide-react";
import type { FilterSelectOption } from "@/components/ui/filter-select";
import type { FilterSurface } from "@/lib/ui/filterOptionStyles";

export const REVIEW_STATUS_LABELS: Record<ReviewStatusValue, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const REVIEW_STATUS_OPTIONS: {
  value: ReviewStatusValue;
  label: string;
}[] = (Object.keys(REVIEW_STATUS_LABELS) as ReviewStatusValue[]).map(
  (value) => ({ value, label: REVIEW_STATUS_LABELS[value] }),
);

const STATUS_ICONS: Record<ReviewStatusValue, LucideIcon> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

const STATUS_ICON_CLASS: Record<ReviewStatusValue, string> = {
  PENDING: "text-amber-500",
  APPROVED: "text-emerald-500",
  REJECTED: "text-rose-500",
};

function mutedIcon(surface: FilterSurface): string {
  return surface === "dark" ? "text-light-200/70" : "text-slate-500";
}

function mutedLabel(surface: FilterSurface): string | undefined {
  return surface === "dark" ? undefined : "text-slate-500";
}

/** FilterSelect options including the "all" sentinel — Lucide icons like tickets. */
export function reviewStatusFilterOptions(
  surface: FilterSurface = "light",
): FilterSelectOption[] {
  return [
    {
      value: "all",
      label: "All Status",
      icon: List,
      iconClassName: mutedIcon(surface),
      itemClassName: mutedLabel(surface),
    },
    ...(Object.keys(REVIEW_STATUS_LABELS) as ReviewStatusValue[]).map(
      (value) => ({
        value,
        label: REVIEW_STATUS_LABELS[value],
        icon: STATUS_ICONS[value],
        iconClassName: STATUS_ICON_CLASS[value],
        itemClassName: surface === "dark" ? undefined : STATUS_ICON_CLASS[value],
      }),
    ),
  ];
}

/** @deprecated Prefer reviewStatusFilterOptions("light") — kept for any legacy imports. */
export const REVIEW_STATUS_FILTER_OPTIONS: FilterSelectOption[] =
  reviewStatusFilterOptions("light");

/** Single-star N/5 tone by score (admin list rating column). */
export function reviewRatingTone(rating: number): string {
  if (rating >= 5) return "text-emerald-600";
  if (rating >= 4) return "text-lime-600";
  if (rating >= 3) return "text-amber-600";
  if (rating >= 2) return "text-orange-600";
  return "text-rose-600";
}
