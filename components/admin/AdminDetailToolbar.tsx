/**
 * Admin detail Back / actions / ID toolbar.
 * Mobile: stacked column, centered — Back → actions → ID.
 * sm+ with actions: Back | ID (middle) | actions.
 * sm+ without actions: Back | ID justify-between (ID end-aligned).
 * Parent: detail header polish
 */
"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminDetailToolbar({
  back,
  actions,
  idChip,
  hasActions = true,
  className,
}: {
  back: ReactNode;
  /** Edit/Delete/Approve CTAs — empty fragment OK when hasActions=false. */
  actions: ReactNode;
  idChip: ReactNode;
  /** When false, sm+ lays out Back | ID with justify-between (no middle flex). */
  hasActions?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-2 text-center",
        "sm:flex-row sm:items-center sm:justify-between sm:text-left",
        className,
      )}
    >
      {/* order-1: Back (all breakpoints) */}
      <div className="order-1 flex shrink-0 justify-center sm:justify-start">
        {back}
      </div>
      {hasActions ? (
        <>
          {/* Mobile order-2 = actions; sm order-3 = end */}
          <div className="order-2 flex shrink-0 flex-wrap items-center justify-center gap-2 sm:order-3 sm:justify-end">
            {actions}
          </div>
          {/* Mobile order-3 = ID last; sm order-2 = middle */}
          <div className="order-3 flex min-w-0 max-w-full justify-center sm:order-2 sm:flex-1 sm:px-2">
            {idChip}
          </div>
        </>
      ) : (
        /* No CTAs — ID sits opposite Back on sm+ */
        <div className="order-2 flex min-w-0 max-w-full justify-center sm:justify-end">
          {idChip}
        </div>
      )}
    </div>
  );
}
