/**
 * DismissibleFilterChips — active filter badges with per-group X + global Reset.
 * Stock-inventory parity for list toolbars (tickets, reviews, books, users…).
 * Parent: CR-0003 / REQ-0034
 */
"use client";

import type { ReactNode } from "react";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FILTER_CHIP_ROW_CLASS,
  filterChipCollapsedClass,
  filterChipDismissBtnClass,
  filterChipGroupLabelClass,
  filterChipResetBtnClass,
  filterChipXClass,
  type FilterChipSurface,
} from "@/lib/ui/filter-chip-styles";

const DEFAULT_MAX_VISIBLE = 3;

export type FilterChipGroup = {
  /** Group label, e.g. "Status", "Priority". */
  label: string;
  values: string[];
  onClear: () => void;
  renderBadge: (value: string) => ReactNode;
  /** Collapse to "N Selected" when values exceed this count. */
  maxVisible?: number;
};

export type DismissibleFilterChipsProps = {
  groups: FilterChipGroup[];
  onReset: () => void;
  /** dark = root glass; light = admin (default) */
  variant?: FilterChipSurface;
};

export function DismissibleFilterChips({
  groups,
  onReset,
  variant = "light",
}: DismissibleFilterChipsProps) {
  const activeGroups = groups.filter((g) => g.values.length > 0);
  if (activeGroups.length === 0) return null;

  return (
    <div className={FILTER_CHIP_ROW_CLASS}>
      {activeGroups.map((group) => {
        const maxVisible = group.maxVisible ?? DEFAULT_MAX_VISIBLE;
        const visibleValues = group.values.slice(0, maxVisible);
        const collapsed = group.values.length > maxVisible;

        return (
          <div key={group.label} className="flex flex-wrap items-center gap-2">
            <span className={filterChipGroupLabelClass(variant)}>
              {group.label}:
            </span>
            <button
              type="button"
              onClick={group.onClear}
              aria-label={`Clear ${group.label.toLowerCase()} filter`}
              className={filterChipDismissBtnClass(variant)}
            >
              <span className="inline-flex flex-wrap items-center gap-1">
                {collapsed ? (
                  <span className={filterChipCollapsedClass(variant)}>
                    {group.values.length} Selected
                  </span>
                ) : (
                  visibleValues.map((value) => (
                    <span key={value}>{group.renderBadge(value)}</span>
                  ))
                )}
              </span>
              <X className={filterChipXClass(variant)} aria-hidden />
            </button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onReset}
        className={filterChipResetBtnClass(variant)}
      >
        <RotateCcw className="size-3.5" aria-hidden />
        Reset
      </Button>
    </div>
  );
}
