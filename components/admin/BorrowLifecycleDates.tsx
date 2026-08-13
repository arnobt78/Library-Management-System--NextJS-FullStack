"use client";

/**
 * Lifecycle date lines under BorrowStatusBadge (User 360 / dialogs).
 * variant light = admin panels; dark = GLASS_ALERT profile / book-detail confirms.
 * Parent: dialog inventory + dates DNA
 */

import { Calendar, CalendarX, CheckCircle2, Clock } from "lucide-react";
import { formatMediumDate } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";

type BorrowLifecycleStatus =
  | "PENDING"
  | "BORROWED"
  | "RETURNED"
  | "CANCELLED"
  | string;

function DateLine({
  label,
  value,
  icon: Icon,
  tone,
  iconTone,
  valueTone,
}: {
  label: string;
  value: string | Date | null | undefined;
  icon: typeof Calendar;
  tone: string;
  iconTone: string;
  valueTone: string;
}) {
  const text = formatMediumDate(value);
  if (!value || text === "—") return null;
  // w-max + nowrap — icon+label+date stay one line; Status col grows to fit
  return (
    <span
      className={cn(
        "inline-flex w-max max-w-none shrink-0 items-center gap-1 whitespace-nowrap text-xs",
        tone,
      )}
    >
      <Icon className={cn("size-3 shrink-0", iconTone)} aria-hidden />
      <span className="font-medium">{label}:</span>
      <span className={valueTone}>{text}</span>
    </span>
  );
}

export function BorrowLifecycleDates({
  status,
  createdAt,
  borrowDate,
  updatedAt,
  dueDate,
  returnDate,
  className,
  variant = "light",
}: {
  status: BorrowLifecycleStatus;
  createdAt?: string | Date | null;
  borrowDate?: string | Date | null;
  updatedAt?: string | Date | null;
  dueDate?: string | Date | null;
  returnDate?: string | Date | null;
  className?: string;
  /** light = admin white panels; dark = root GLASS_ALERT dialogs */
  variant?: "light" | "dark";
}) {
  const isDark = variant === "dark";
  const valueTone = isDark ? "text-light-200" : "text-gray-700";
  const requested = createdAt ?? borrowDate;
  const showApproved =
    (status === "BORROWED" || status === "RETURNED") && updatedAt;
  const showDue = Boolean(dueDate) && status !== "CANCELLED";
  const showReturned = status === "RETURNED" && returnDate;
  const showCancelled = status === "CANCELLED" && updatedAt;

  return (
    <div className={cn("mt-1 flex flex-col gap-0.5 leading-none", className)}>
      <DateLine
        label="Requested"
        value={requested}
        icon={Calendar}
        tone={isDark ? "text-sky-300" : "text-sky-700"}
        iconTone={isDark ? "text-sky-300" : "text-sky-600"}
        valueTone={valueTone}
      />
      {showApproved ? (
        <DateLine
          label="Approved"
          value={updatedAt}
          icon={CheckCircle2}
          tone={isDark ? "text-blue-300" : "text-blue-700"}
          iconTone={isDark ? "text-blue-300" : "text-blue-600"}
          valueTone={valueTone}
        />
      ) : null}
      {showDue ? (
        <DateLine
          label="Due"
          value={dueDate}
          icon={Clock}
          tone={isDark ? "text-violet-300" : "text-violet-700"}
          iconTone={isDark ? "text-violet-300" : "text-violet-600"}
          valueTone={valueTone}
        />
      ) : null}
      {showReturned ? (
        <DateLine
          label="Returned"
          value={returnDate}
          icon={Calendar}
          tone={isDark ? "text-emerald-300" : "text-emerald-700"}
          iconTone={isDark ? "text-emerald-300" : "text-emerald-600"}
          valueTone={valueTone}
        />
      ) : null}
      {showCancelled ? (
        <DateLine
          label="Cancelled"
          value={updatedAt}
          icon={CalendarX}
          tone={isDark ? "text-rose-300" : "text-slate-600"}
          iconTone={isDark ? "text-rose-300" : "text-slate-500"}
          valueTone={valueTone}
        />
      ) : null}
    </div>
  );
}
