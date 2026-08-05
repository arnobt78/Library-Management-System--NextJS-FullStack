/**
 * Created / Updated meta with Lucide icons — list densify + detail headers.
 * Parent: CR-0003 / REQ-0034
 */
import { CalendarClock, CalendarPlus } from "lucide-react";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";

export function TicketDateMeta({
  createdAt,
  updatedAt,
  variant = "light",
  /** stack = two lines (lists); inline = · separators (headers) */
  layout = "stack",
  className,
}: {
  createdAt: string | Date | null | undefined;
  updatedAt: string | Date | null | undefined;
  variant?: "light" | "dark";
  layout?: "stack" | "inline";
  className?: string;
}) {
  const isDark = variant === "dark";
  const createdTone = isDark ? "text-emerald-300/90" : "text-emerald-700";
  const updatedTone = isDark ? "text-amber-200/80" : "text-amber-700/90";

  if (layout === "inline") {
    return (
      <p
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm",
          isDark ? "text-light-200/70" : "text-gray-500",
          className,
        )}
      >
        <span className={cn("inline-flex items-center gap-1", createdTone)}>
          <CalendarPlus className="size-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="opacity-70">Created</span>{" "}
          {formatMediumDateTime(createdAt)}
        </span>
        <span className="opacity-40" aria-hidden>
          ·
        </span>
        <span className={cn("inline-flex items-center gap-1", updatedTone)}>
          <CalendarClock className="size-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="opacity-70">Updated</span>{" "}
          {formatMediumDateTime(updatedAt)}
        </span>
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0.5 whitespace-nowrap text-xs",
        className,
      )}
    >
      <p className={cn("inline-flex items-center gap-1", createdTone)}>
        <CalendarPlus className="size-3 shrink-0 opacity-80" aria-hidden />
        <span className="opacity-70">Created:</span>{" "}
        {formatMediumDateTime(createdAt)}
      </p>
      <p className={cn("inline-flex items-center gap-1", updatedTone)}>
        <CalendarClock className="size-3 shrink-0 opacity-80" aria-hidden />
        <span className="opacity-70">Updated:</span>{" "}
        {formatMediumDateTime(updatedAt)}
      </p>
    </div>
  );
}
