/**
 * DataTable — generic TanStack Table wrapper shared by every admin list
 * (new tickets/reviews/activity + retrofitted users/books/book-requests)
 * and dark user surfaces (support tickets glass).
 * Parent: CR-0003 / REQ-0034
 *
 * `variant="dark"` uses frosted borders + light text for the root shell;
 * `variant="light"` (default) keeps admin white-panel chrome.
 */
"use client";

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TABLE_HEADER_LABEL } from "@/lib/ui/tableCellStyles";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  /** Skeleton row count while isLoading (default 5) */
  skeletonRows?: number;
  emptyMessage?: ReactNode;
  onRowClick?: (row: TData) => void;
  /** Disable client pagination for small/pre-filtered lists (default true) */
  paginated?: boolean;
  initialPageSize?: number;
  className?: string;
  rowClassName?: (row: TData) => string | undefined;
  /** light = admin; dark = root glass pages (support tickets) */
  variant?: "light" | "dark";
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  skeletonRows = 5,
  emptyMessage = "No results found.",
  onRowClick,
  paginated = true,
  initialPageSize = 10,
  className,
  rowClassName,
  variant = "light",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: paginated ? getPaginationRowModel() : undefined,
    manualPagination: !paginated,
    // Stable column widths when cell content length changes after densify.
    defaultColumn: { size: 120, minSize: 72, maxSize: 480 },
  });

  const rows = table.getRowModel().rows;
  const columnCount = columns.length;
  const isDark = variant === "dark";

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-xl border",
          isDark ? "border-white/10" : "border-gray-100",
        )}
      >
        <Table
          className={cn(
            // Fixed layout + column size/minSize → no width jump when densify
            // updates subject/status text length (stock-inventory parity).
            "table-fixed",
          )}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className={cn(
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/5"
                    : "bg-gray-50/60 hover:bg-gray-50/60",
                )}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      minWidth: header.column.columnDef.minSize,
                    }}
                    className={cn(isDark && "text-light-200")}
                  >
                    {header.isPlaceholder
                      ? null
                      : (() => {
                          const rendered = flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          );
                          // Plain string headers (Comment, Status, …) get the
                          // same font-medium label weight as SortableHeader.
                          if (typeof rendered === "string") {
                            return (
                              <span
                                className={cn(
                                  TABLE_HEADER_LABEL,
                                  isDark && "text-light-200",
                                )}
                              >
                                {rendered}
                              </span>
                            );
                          }
                          return rendered;
                        })()}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow
                  key={`skeleton-${i}`}
                  className={cn(isDark && "border-white/10")}
                >
                  {Array.from({ length: columnCount }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton
                        className={cn(
                          "h-4 w-full max-w-40",
                          isDark && "bg-white/10",
                        )}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={
                    onRowClick
                      ? (event) => {
                          // Skip interactive cells / portaled menu items so
                          // kebab Edit/Delete never ghost-clicks into detail.
                          const target = event.target as HTMLElement | null;
                          if (
                            target?.closest(
                              'a, button, input, textarea, select, label, [role="menuitem"], [role="option"], [data-radix-collection-item], [data-no-row-click]',
                            )
                          ) {
                            return;
                          }
                          onRowClick(row.original);
                        }
                      : undefined
                  }
                  className={cn(
                    onRowClick && "cursor-pointer",
                    // Override TableRow's light hover:bg-gray-50/80 on dark lists
                    isDark
                      ? "border-white/10 hover:bg-white/5 data-[state=selected]:bg-white/10"
                      : undefined,
                    rowClassName?.(row.original),
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                        minWidth: cell.column.columnDef.minSize,
                      }}
                      className={cn(isDark && "text-light-100")}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              // TableRow defaults to hover:bg-gray-50/80 — wash out dark empty copy.
              <TableRow
                className={cn(
                  "hover:bg-transparent data-[state=selected]:bg-transparent",
                  isDark && "border-white/10",
                )}
              >
                <TableCell
                  colSpan={columnCount}
                  className={cn(
                    "h-24 text-center",
                    // Allow richer empty states (message + Clear Filters) to breathe
                    typeof emptyMessage !== "string" && "h-auto py-2",
                    isDark ? "text-light-200/80" : "text-gray-500",
                  )}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {paginated && !isLoading && rows.length > 0 ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div
            className={cn(
              "flex items-center gap-2 text-xs sm:text-sm",
              isDark ? "text-light-200/70" : "text-gray-500",
            )}
          >
            <span>Rows per page</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) => {
                setPagination({ pageIndex: 0, pageSize: Number(v) });
              }}
            >
              <SelectTrigger
                className={cn(
                  // Fit value + chevron (fixed w-16 clipped "10"; span flex-1 also squeezed)
                  "h-8 w-auto min-w-[4.5rem] gap-1.5 px-2.5 [&>span]:w-auto [&>span]:flex-none",
                  isDark
                    ? "border-white/15 bg-dark-300 text-light-100"
                    : "border-gray-300 bg-white",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 text-xs sm:text-sm",
              isDark ? "text-light-200/70" : "text-gray-500",
            )}
          >
            <span>
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {Math.max(table.getPageCount(), 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "size-8 p-0",
                isDark &&
                  "border-white/15 bg-dark-300/60 text-light-100 hover:bg-white/10",
              )}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "size-8 p-0",
                isDark &&
                  "border-white/15 bg-dark-300/60 text-light-100 hover:bg-white/10",
              )}
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
