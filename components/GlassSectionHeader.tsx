/**
 * GlassSectionHeader — icon left + title/subtitle stack with glassmorphic chrome.
 * Optional `trailing` (e.g. New Ticket) sits top-right inside the same header card.
 * Used on My Profile stats + tab section titles (UI_STYLING_GUIDE).
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassSectionHeaderProps {
  icon: ReactNode;
  title: string;
  /** Plain string or rich node (e.g. TicketDateMeta with icons). */
  subtitle: ReactNode;
  /** Right-side action(s) inside the glass header (not absolutely positioned). */
  trailing?: ReactNode;
  className?: string;
  /** Override title tone (e.g. sky link parity on ticket detail). */
  titleClassName?: string;
  as?: "h1" | "h2" | "h3";
}

export default function GlassSectionHeader({
  icon,
  title,
  subtitle,
  trailing,
  className,
  titleClassName,
  as: Heading = "h2",
}: GlassSectionHeaderProps) {
  return (
    <div className={cn("glass-section-header", className)}>
      <div className="glass-section-header__icon" aria-hidden>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <Heading
          className={cn(
            "text-base font-medium leading-tight text-light-100 sm:text-lg",
            titleClassName,
          )}
        >
          {title}
        </Heading>
        {typeof subtitle === "string" ? (
          <p className="text-xs leading-snug text-light-200 sm:text-sm">
            {subtitle}
          </p>
        ) : (
          <div>{subtitle}</div>
        )}
      </div>
      {trailing ? (
        <div className="ml-auto shrink-0 self-center">{trailing}</div>
      ) : null}
    </div>
  );
}
