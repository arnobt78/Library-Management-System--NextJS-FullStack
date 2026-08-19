/**
 * Created / Updated meta with Lucide icons — list densify + detail headers.
 * Optional labels for Joined / Registered / Requested under PersonAttribution.
 * hideCreated / hideUpdated allow single-line stacks (e.g. Created under Requester,
 * Updated under Assigned To — Borrow Queue DNA).
 * Updated shows "—" when null or same instant as Created (DB defaultNow on insert).
 * Parent: CR-0003 / REQ-0034
 */
import { CalendarClock, CalendarPlus } from "lucide-react";
import { formatMediumDate, formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";

/** True when updatedAt is a meaningful edit after createdAt (not insert default). */
export function hasMeaningfulUpdatedAt(
  createdAt?: string | Date | null,
  updatedAt?: string | Date | null,
): boolean {
  if (updatedAt == null || updatedAt === "") return false;
  if (createdAt == null || createdAt === "") return true;
  const c = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  const u = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  if (Number.isNaN(c) || Number.isNaN(u)) return Boolean(updatedAt);
  // Same-second insert defaults count as "no update yet".
  return Math.abs(u - c) >= 1000;
}

export function TicketDateMeta({
  createdAt,
  updatedAt,
  variant = "light",
  /** stack = two lines (lists); inline = · separators (headers) */
  layout = "stack",
  /** Created-line label (e.g. Joined, Registered, Requested). */
  createdLabel = "Created",
  /** Updated-line label; omit line when hideUpdated. */
  updatedLabel = "Updated",
  /** When true, skip Created row (Updated-only under assignee). */
  hideCreated = false,
  /** When true, skip Updated row even if updatedAt is set. */
  hideUpdated = false,
  /** When true, always format updatedAt (Due/Borrowed pairs) — skip insert-default dash. */
  independentUpdated = false,
  /** Date-only Created line (borrow Due calendar day — no 2 AM clock). */
  createdDateOnly = false,
  className,
}: {
  createdAt?: string | Date | null | undefined;
  updatedAt?: string | Date | null | undefined;
  variant?: "light" | "dark";
  layout?: "stack" | "inline";
  createdLabel?: string;
  updatedLabel?: string;
  hideCreated?: boolean;
  hideUpdated?: boolean;
  independentUpdated?: boolean;
  createdDateOnly?: boolean;
  className?: string;
}) {
  const isDark = variant === "dark";
  const createdDisplay = createdDateOnly
    ? formatMediumDate(createdAt)
    : formatMediumDateTime(createdAt);
  const createdTone = isDark ? "text-emerald-300/90" : "text-emerald-700";
  const updatedTone = isDark ? "text-amber-200/80" : "text-amber-700/90";
  const showCreated = !hideCreated;
  const showUpdated = !hideUpdated;
  const updatedDisplay =
    independentUpdated && updatedAt != null && updatedAt !== ""
      ? formatMediumDateTime(updatedAt)
      : hasMeaningfulUpdatedAt(createdAt, updatedAt)
        ? formatMediumDateTime(updatedAt)
        : "—";

  if (layout === "inline") {
    return (
      <p
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm",
          isDark ? "text-light-200/70" : "text-gray-500",
          className,
        )}
      >
        {showCreated ? (
          <span className={cn("inline-flex items-center gap-1", createdTone)}>
            <CalendarPlus className="size-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="opacity-70">{createdLabel}</span>{" "}
            {createdDisplay}
          </span>
        ) : null}
        {showCreated && showUpdated ? (
          <span className="opacity-40" aria-hidden>
            ·
          </span>
        ) : null}
        {showUpdated ? (
          <span className={cn("inline-flex items-center gap-1", updatedTone)}>
            <CalendarClock className="size-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="opacity-70">{updatedLabel}</span>{" "}
            {updatedDisplay}
          </span>
        ) : null}
      </p>
    );
  }

  // gap-0 + leading-none — flush under PersonAttribution email (no mt-0.5).
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0 whitespace-nowrap text-xs leading-none",
        className,
      )}
    >
      {showCreated ? (
        <p className={cn("inline-flex items-center gap-1 leading-none", createdTone)}>
          <CalendarPlus className="size-3 shrink-0 opacity-80" aria-hidden />
          <span className="opacity-70">{createdLabel}:</span>{" "}
          {createdDisplay}
        </p>
      ) : null}
      {showUpdated ? (
        <p className={cn("inline-flex items-center gap-1 leading-none", updatedTone)}>
          <CalendarClock className="size-3 shrink-0 opacity-80" aria-hidden />
          <span className="opacity-70">{updatedLabel}:</span>{" "}
          {updatedDisplay}
        </p>
      ) : null}
    </div>
  );
}
