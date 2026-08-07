/**
 * Shared admin list header row — title (+ optional count) on the left,
 * SearchInput / embedded FilterSelect / MultiSelectFilter as `children` on the right.
 * Children should use label-in-trigger filters (no stacked labels above controls).
 * Optional `chips` slot renders dismissible active-filter badges under the toolbar.
 * Parent: CR-0003 / REQ-0034 cosmetic DRY
 *
 * Does NOT wrap `admin-panel` or the DataTable — callers keep:
 *   <div className="admin-panel">
 *     <AdminListToolbar … chips={…}>{filters}</AdminListToolbar>
 *     <DataTable … />
 *   </div>
 */
import type { ReactNode } from "react";

export function AdminListToolbar({
  title,
  count,
  children,
  chips,
}: {
  title: string;
  count?: number;
  children: ReactNode;
  /** Active filter chip row (DismissibleFilterChips) under the controls */
  chips?: ReactNode;
}) {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium text-dark-400 sm:text-xl">
          {count !== undefined ? `${title} (${count})` : title}
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {children}
        </div>
      </div>
      {chips}
    </div>
  );
}
