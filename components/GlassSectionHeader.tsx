/**
 * GlassSectionHeader — icon left + title/subtitle stack with glassmorphic chrome.
 * Used on My Profile stats + tab section titles (UI_STYLING_GUIDE).
 */

import React from "react";
import { cn } from "@/lib/utils";

interface GlassSectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
}

export default function GlassSectionHeader({
  icon,
  title,
  subtitle,
  className,
  as: Heading = "h2",
}: GlassSectionHeaderProps) {
  return (
    <div className={cn("glass-section-header", className)}>
      <div className="glass-section-header__icon" aria-hidden>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <Heading className="text-base font-semibold leading-tight text-light-100 sm:text-lg">
          {title}
        </Heading>
        <p className="text-xs leading-snug text-light-200 sm:text-sm">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
