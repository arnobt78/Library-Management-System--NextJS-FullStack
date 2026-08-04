"use client";

/**
 * Shared muted date/time line with a Lucide icon (signup + admin decision cards).
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DateMetaLineProps = {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
};

export default function DateMetaLine({
  icon: Icon,
  children,
  className,
}: DateMetaLineProps) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 text-xs sm:text-sm",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
