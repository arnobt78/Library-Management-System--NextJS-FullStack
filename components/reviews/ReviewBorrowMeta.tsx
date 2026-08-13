/**
 * Borrowed / Due / Returned / Cancelled chips with Lucide icons + meaningful tones.
 * Shared by My Reviews (dark), admin review detail, and Library Overview Recent 5.
 * Parent: CR-0003 / review detail redesign; CANCELLED date for overview Recent 5
 */
"use client";

import { Calendar, CalendarX, Clock } from "lucide-react";
import { formatBorrowDate } from "@/lib/profile/formatBorrowDates";
import { cn } from "@/lib/utils";

export function ReviewBorrowMeta({
  borrowedAt,
  dueDate,
  returnedAt,
  cancelledAt,
  variant = "dark",
  className,
}: {
  borrowedAt?: string | Date | null;
  dueDate?: string | Date | null;
  returnedAt?: string | Date | null;
  /** When set (CANCELLED rows), show Cancelled chip and hide Due. */
  cancelledAt?: string | Date | null;
  variant?: "dark" | "light";
  className?: string;
}) {
  const borrowedLabel = formatBorrowDate(borrowedAt);
  const dueLabel = cancelledAt ? null : formatBorrowDate(dueDate);
  const returnedLabel = formatBorrowDate(returnedAt);
  const cancelledLabel = formatBorrowDate(cancelledAt);
  if (!borrowedLabel && !dueLabel && !returnedLabel && !cancelledLabel)
    return null;

  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm",
        className,
      )}
    >
      {borrowedLabel ? (
        <span
          className={cn(
            "inline-flex items-center gap-1",
            isDark ? "text-light-200" : "text-blue-700",
          )}
        >
          <Calendar
            className={cn(
              "size-3 sm:size-4",
              isDark ? "text-blue-400" : "text-blue-600",
            )}
            aria-hidden
          />
          <span className="font-medium">Borrowed:</span>
          <span className={isDark ? "text-light-100" : "text-dark-400"}>
            {borrowedLabel}
          </span>
        </span>
      ) : null}
      {dueLabel ? (
        <span
          className={cn(
            "inline-flex items-center gap-1",
            isDark ? "text-light-200" : "text-violet-700",
          )}
        >
          <Clock
            className={cn(
              "size-3 sm:size-4",
              isDark ? "text-purple-400" : "text-violet-600",
            )}
            aria-hidden
          />
          <span className="font-medium">Due:</span>
          <span className={isDark ? "text-light-100" : "text-dark-400"}>
            {dueLabel}
          </span>
        </span>
      ) : null}
      {returnedLabel ? (
        <span
          className={cn(
            "inline-flex items-center gap-1",
            isDark ? "text-light-200" : "text-emerald-700",
          )}
        >
          <Calendar
            className={cn(
              "size-3 sm:size-4",
              isDark ? "text-emerald-400" : "text-emerald-600",
            )}
            aria-hidden
          />
          <span className="font-medium">Returned:</span>
          <span className={isDark ? "text-light-100" : "text-dark-400"}>
            {returnedLabel}
          </span>
        </span>
      ) : null}
      {cancelledLabel ? (
        <span
          className={cn(
            "inline-flex items-center gap-1",
            isDark ? "text-light-200" : "text-slate-600",
          )}
        >
          <CalendarX
            className={cn(
              "size-3 sm:size-4",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
            aria-hidden
          />
          <span className="font-medium">Cancelled:</span>
          <span className={isDark ? "text-light-100" : "text-dark-400"}>
            {cancelledLabel}
          </span>
        </span>
      ) : null}
    </div>
  );
}
