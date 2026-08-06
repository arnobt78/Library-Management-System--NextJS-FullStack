/**
 * ReviewDateMeta — Submitted / Approved / Rejected / Updated chips with
 * Lucide icons, · separators, and meaningful tones (ticket-date parity).
 * Shared by book-detail ReviewsSection, My Reviews, and admin review detail.
 * Parent: CR-0003 / REQ-0035 polish
 */

"use client";

import {
  CalendarArrowUp,
  CalendarCheck2,
  CalendarX2,
  ShieldCheck,
} from "lucide-react";
import { ATTRIBUTION_META_SIZE } from "@/lib/ui/attributionStyles";
import { cn } from "@/lib/utils";

function formatWhen(value: string | Date | null | undefined): string {
  if (!value) return "N/A";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString();
}

export type ReviewDateMetaProps = {
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  reviewedAt?: string | Date | null;
  status?: ReviewStatusValue | null;
  className?: string;
  /** dark = profile/book glass; light = admin white panels */
  variant?: "dark" | "light";
};

export default function ReviewDateMeta({
  createdAt,
  updatedAt,
  reviewedAt,
  status,
  className,
  variant = "dark",
}: ReviewDateMetaProps) {
  const isEdited =
    createdAt &&
    updatedAt &&
    new Date(createdAt).getTime() !== new Date(updatedAt).getTime();

  const isDark = variant === "dark";
  const sep = isDark ? "text-light-200/40" : "text-gray-300";

  // Per-chip tones — match TicketDateMeta emerald/amber language.
  const tones = {
    submitted: isDark ? "text-emerald-300/90" : "text-emerald-700",
    approved: isDark ? "text-sky-300/90" : "text-sky-700",
    rejected: isDark ? "text-amber-200/80" : "text-amber-700",
    updated: isDark ? "text-amber-200/80" : "text-amber-700/90",
  } as const;

  const chips: Array<{
    key: keyof typeof tones;
    icon: typeof CalendarCheck2;
    label: string;
  }> = [
    {
      key: "submitted",
      icon: CalendarCheck2,
      label: `Submitted ${formatWhen(createdAt)}`,
    },
  ];

  if (status === "APPROVED" && reviewedAt) {
    chips.push({
      key: "approved",
      icon: ShieldCheck,
      label: `Approved ${formatWhen(reviewedAt)}`,
    });
  } else if (status === "REJECTED" && reviewedAt) {
    chips.push({
      key: "rejected",
      icon: CalendarX2,
      label: `Rejected ${formatWhen(reviewedAt)}`,
    });
  }

  if (isEdited) {
    chips.push({
      key: "updated",
      icon: CalendarArrowUp,
      label: `Updated ${formatWhen(updatedAt)}`,
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1",
        ATTRIBUTION_META_SIZE,
        className,
      )}
    >
      {chips.map((chip, i) => {
        const Icon = chip.icon;
        return (
          <span
            key={chip.key}
            className={cn("inline-flex items-center gap-1", tones[chip.key])}
          >
            {i > 0 ? (
              <span className={cn("mx-0.5", sep)} aria-hidden>
                ·
              </span>
            ) : null}
            <Icon className="size-3.5 shrink-0 sm:size-4" aria-hidden />
            <span>{chip.label}</span>
          </span>
        );
      })}
    </div>
  );
}
