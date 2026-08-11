"use client";

/**
 * User 360 Borrowing History — lifecycle date lines under BorrowStatusBadge.
 * Medium date (Aug 6, 2026); tones align with ReviewBorrowMeta light variant.
 */

import { Calendar, CalendarX, CheckCircle2, Clock } from "lucide-react";
import { formatMediumDate } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";

type BorrowLifecycleStatus =
  "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED" | string;

function DateLine({
  label,
  value,
  icon: Icon,
  tone,
  iconTone,
}: {
  label: string;
  value: string | Date | null | undefined;
  icon: typeof Calendar;
  tone: string;
  iconTone: string;
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
      <span className="text-gray-700">{text}</span>
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
}: {
  status: BorrowLifecycleStatus;
  createdAt?: string | Date | null;
  borrowDate?: string | Date | null;
  updatedAt?: string | Date | null;
  dueDate?: string | Date | null;
  returnDate?: string | Date | null;
  className?: string;
}) {
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
        tone="text-sky-700"
        iconTone="text-sky-600"
      />
      {showApproved ? (
        <DateLine
          label="Approved"
          value={updatedAt}
          icon={CheckCircle2}
          tone="text-blue-700"
          iconTone="text-blue-600"
        />
      ) : null}
      {showDue ? (
        <DateLine
          label="Due"
          value={dueDate}
          icon={Clock}
          tone="text-violet-700"
          iconTone="text-violet-600"
        />
      ) : null}
      {showReturned ? (
        <DateLine
          label="Returned"
          value={returnDate}
          icon={Calendar}
          tone="text-emerald-700"
          iconTone="text-emerald-600"
        />
      ) : null}
      {showCancelled ? (
        <DateLine
          label="Cancelled"
          value={updatedAt}
          icon={CalendarX}
          tone="text-slate-600"
          iconTone="text-slate-500"
        />
      ) : null}
    </div>
  );
}
