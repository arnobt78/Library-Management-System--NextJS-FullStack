/**
 * Shared centered empty copy for User 360 card bodies (not filter empty states).
 * Header cell token matches list TABLE_HEADER_LABEL + text-dark-400.
 */

import { cn } from "@/lib/utils";
import { TABLE_HEADER_LABEL } from "@/lib/ui/tableCellStyles";

export function AdminDetailEmptyState({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-28 items-center justify-center px-4 text-center text-sm italic text-gray-400",
        className,
      )}
    >
      {message}
    </div>
  );
}

/** Native table headers on User 360 cards. */
export const USER_360_TH = cn(TABLE_HEADER_LABEL, "py-2 text-dark-400");

/** Phone-only table x-scroll — laptop/desktop must not grow a horizontal bar. */
export const USER_360_TABLE_SCROLL = "max-sm:overflow-x-auto";

/** Fixed layout so Book truncate + Status budgets stay inside half-width cards. */
export const USER_360_TABLE = "w-full table-fixed text-left text-sm";
