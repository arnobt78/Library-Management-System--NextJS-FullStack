/**
 * Shared TanStack DataTable cell/header typography tokens.
 * Headers stay font-medium; titles/names in cells stay font-normal.
 * Compose TABLE_CELL_TITLE with SKY_LINK_* at call sites.
 * Parent: table UI polish (Book Reviews + admin queues)
 */

/** SortableHeader + plain string DataTable headers. */
export const TABLE_HEADER_LABEL =
  "text-xs font-medium text-gray-600 sm:text-sm";

/** Clickable title / subject / book name in table cells (pair with sky links). */
export const TABLE_CELL_TITLE = "text-sm font-normal";

/** Non-link name / label text in table cells. */
export const TABLE_CELL_STATIC = "text-sm font-normal text-gray-700";
