/**
 * BorrowLifecycleDateMeta — Requested / Approved / Due / Returned / Cancelled / Updated
 * chips with Lucide icons, · separators (ReviewDateMeta DNA for borrow detail header).
 * Parent: Borrow + Review detail DNA polish
 */

"use client";

import {
  CalendarArrowUp,
  CalendarCheck2,
  CalendarX2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { formatMediumDate, formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { ATTRIBUTION_META_SIZE } from "@/lib/ui/attributionStyles";
import { cn } from "@/lib/utils";

function formatWhen(value: string | Date | null | undefined): string {
  if (!value) return "N/A";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return formatMediumDateTime(d);
}

function formatDueDay(value: string | Date | null | undefined): string {
  if (!value) return "N/A";
  const text = formatMediumDate(value);
  return text === "—" ? "N/A" : text;
}

type BorrowLifecycleStatus =
  | "PENDING"
  | "BORROWED"
  | "RETURNED"
  | "CANCELLED"
  | string;

export type BorrowLifecycleDateMetaProps = {
  status: BorrowLifecycleStatus;
  createdAt?: string | Date | null;
  borrowDate?: string | Date | null;
  updatedAt?: string | Date | null;
  approvedAt?: string | Date | null;
  cancelledAt?: string | Date | null;
  renewedAt?: string | Date | null;
  dueDate?: string | Date | null;
  returnDate?: string | Date | null;
  className?: string;
  /** light = admin white panels; dark = glass (future) */
  variant?: "light" | "dark";
};

export function BorrowLifecycleDateMeta({
  status,
  createdAt,
  borrowDate,
  updatedAt,
  approvedAt,
  cancelledAt,
  renewedAt,
  dueDate,
  returnDate,
  className,
  variant = "light",
}: BorrowLifecycleDateMetaProps) {
  const isDark = variant === "dark";
  const sep = isDark ? "text-light-200/40" : "text-gray-300";

  const tones = {
    requested: isDark ? "text-emerald-300/90" : "text-emerald-700",
    approved: isDark ? "text-sky-300/90" : "text-sky-700",
    due: isDark ? "text-violet-300/90" : "text-violet-700",
    renewed: isDark ? "text-purple-300/90" : "text-purple-700",
    returned: isDark ? "text-emerald-300/90" : "text-emerald-700",
    cancelled: isDark ? "text-rose-300/90" : "text-rose-700",
    updated: isDark ? "text-amber-200/80" : "text-amber-700/90",
  } as const;

  const chips: Array<{
    key: keyof typeof tones;
    icon: typeof CalendarCheck2;
    label: string;
  }> = [
    {
      key: "requested",
      icon: CalendarCheck2,
      label: `Requested ${formatWhen(createdAt ?? borrowDate)}`,
    },
  ];

  const approvedStamp = approvedAt;
  if (
    (status === "BORROWED" || status === "RETURNED") &&
    approvedStamp &&
    formatWhen(approvedStamp) !== "N/A"
  ) {
    chips.push({
      key: "approved",
      icon: ShieldCheck,
      label: `Approved ${formatWhen(approvedStamp)}`,
    });
  }

  if (
    dueDate &&
    status !== "CANCELLED" &&
    formatDueDay(dueDate) !== "N/A"
  ) {
    chips.push({
      key: "due",
      icon: Clock,
      label: `Due ${formatDueDay(dueDate)}`,
    });
  }

  if (
    renewedAt &&
    status !== "CANCELLED" &&
    status !== "PENDING" &&
    formatWhen(renewedAt) !== "N/A"
  ) {
    chips.push({
      key: "renewed",
      icon: RefreshCw,
      label: `Renewed ${formatWhen(renewedAt)}`,
    });
  }

  if (
    status === "RETURNED" &&
    returnDate &&
    formatWhen(returnDate) !== "N/A"
  ) {
    chips.push({
      key: "returned",
      icon: Undo2,
      label: `Returned ${formatWhen(returnDate)}`,
    });
  }

  const cancelledStamp = cancelledAt ?? updatedAt;
  if (
    status === "CANCELLED" &&
    cancelledStamp &&
    formatWhen(cancelledStamp) !== "N/A"
  ) {
    chips.push({
      key: "cancelled",
      icon: CalendarX2,
      label: `Cancelled ${formatWhen(cancelledStamp)}`,
    });
  }

  const isEdited =
    createdAt &&
    updatedAt &&
    new Date(createdAt).getTime() !== new Date(updatedAt).getTime() &&
    status !== "CANCELLED";

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
            key={`${chip.key}-${i}`}
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
