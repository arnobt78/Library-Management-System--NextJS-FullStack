/**
 * Notification dropdown badges — BookWise rose/glass (stock feature parity,
 * not a commerce pixel copy). Parent: CR-0003 / REQ-0034
 */
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationCountHue = "slate" | "rose";

/** Compact circular count chip for `N total · M unread` header line. */
export function NotificationCountBadge({
  children,
  hue = "slate",
  className,
}: {
  children: ReactNode;
  hue?: NotificationCountHue;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[1.25rem] items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none tabular-nums sm:text-[11px]",
        hue === "rose"
          ? "border-rose-400/40 bg-gradient-to-r from-rose-500/30 via-rose-500/15 to-rose-600/20 text-rose-100 shadow-[0_6px_16px_rgba(244,63,94,0.2)]"
          : "border-gray-400/35 bg-gradient-to-r from-gray-500/25 via-gray-500/12 to-gray-600/18 text-light-100 shadow-[0_6px_16px_rgba(107,114,128,0.18)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Light Header variant — slate/rose chips that read on white glass. */
export function NotificationCountBadgeLight({
  children,
  hue = "slate",
  className,
}: {
  children: ReactNode;
  hue?: NotificationCountHue;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[1.25rem] items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none tabular-nums sm:text-[11px]",
        hue === "rose"
          ? "border-rose-300/60 bg-rose-50/90 text-rose-700 shadow-sm backdrop-blur-sm"
          : "border-slate-200/80 bg-slate-50/90 text-slate-600 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Rose glass “New” pill for unread rows. */
export function NotificationNewBadge({
  className,
  surface = "dark",
}: {
  className?: string;
  surface?: "dark" | "light";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        surface === "dark"
          ? "border-rose-400/40 bg-gradient-to-r from-rose-500/35 via-rose-500/20 to-rose-600/25 text-rose-100 shadow-[0_6px_16px_rgba(244,63,94,0.22)]"
          : "border-rose-300/60 bg-rose-50/95 text-rose-700 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <Sparkles className="size-2.5" aria-hidden />
      New
    </span>
  );
}
