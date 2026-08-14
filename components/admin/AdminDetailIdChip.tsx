/**
 * Back-row entity ID chip for admin detail pages.
 * Label + Lucide icon + CopyableText UUID — Ticket / Borrow / Review DNA.
 * Parent: admin detail ID polish
 */
"use client";

import type { LucideIcon } from "lucide-react";
import CopyableText from "@/components/ui/CopyableText";
import { cn } from "@/lib/utils";

export function AdminDetailIdChip({
  label,
  value,
  icon: Icon,
  className,
}: {
  /** e.g. Ticket ID · Borrow Request ID · Review ID */
  label: string;
  value: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600",
        className,
      )}
    >
      <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-gray-500">
        <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
        {label}
      </span>
      <CopyableText
        value={value}
        label={label}
        className="min-w-0 font-mono text-xs text-gray-800 sm:text-sm"
      />
    </div>
  );
}
