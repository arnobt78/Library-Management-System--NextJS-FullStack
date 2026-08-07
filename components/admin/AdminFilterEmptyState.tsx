/**
 * AdminFilterEmptyState — unified empty UI for admin list filter/search misses.
 *
 * Copy: `No {entityLabel} found matching your criteria.`
 * - Whole line: `text-sm font-normal`
 * - Entity label: `font-medium`
 * - Action: outline "Clear Filters" (instant — parent must gate on local/display filters,
 *   not debounced URL params, so the button does not appear a beat late).
 */
"use client";

import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AdminFilterEmptyStateProps {
  /** Feature noun shown in medium weight, e.g. "books", "borrow requests". */
  entityLabel: string;
  /** True when search/select filters are active (prefer local/display state). */
  filtered: boolean;
  /** Clears search + select filters; required when `filtered`. */
  onClear?: () => void;
  /** Unfiltered empty copy (no Clear button). */
  blankMessage?: string;
  className?: string;
}

export function AdminFilterEmptyState({
  entityLabel,
  filtered,
  onClear,
  blankMessage,
  className,
}: AdminFilterEmptyStateProps) {
  return (
    <div className={cn("py-6 text-center sm:py-8", className)}>
      <p className="mb-4 text-sm font-normal text-gray-600">
        {filtered ? (
          <>
            No <span className="font-medium">{entityLabel}</span> found matching
            your criteria.
          </>
        ) : (
          (blankMessage ?? `No ${entityLabel} found.`)
        )}
      </p>
      {filtered && onClear ? (
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          className="mt-2 border-gray-300 text-dark-400 hover:bg-gray-100"
        >
          <FilterX className="size-4" aria-hidden />
          Clear Filters
        </Button>
      ) : null}
    </div>
  );
}
