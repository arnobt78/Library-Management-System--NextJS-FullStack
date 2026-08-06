/**
 * Borrowed / Due / Returned chips with Lucide icons + meaningful tones.
 * Shared by My Reviews (dark) and admin review detail (light).
 * Parent: CR-0003 / review detail redesign
 */
"use client";

import { Calendar, Clock } from "lucide-react";
import { formatBorrowDate } from "@/lib/profile/formatBorrowDates";
import { cn } from "@/lib/utils";

export function ReviewBorrowMeta({
  borrowedAt,
  dueDate,
  returnedAt,
  variant = "dark",
  className,
}: {
  borrowedAt?: string | Date | null;
  dueDate?: string | Date | null;
  returnedAt?: string | Date | null;
  variant?: "dark" | "light";
  className?: string;
}) {
  const borrowedLabel = formatBorrowDate(borrowedAt);
  const dueLabel = formatBorrowDate(dueDate);
  const returnedLabel = formatBorrowDate(returnedAt);
  if (!borrowedLabel && !dueLabel && !returnedLabel) return null;

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
    </div>
  );
}
