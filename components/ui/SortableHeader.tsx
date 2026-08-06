/**
 * SortableHeader — shared TanStack Table column header button.
 * Header labels use TABLE_HEADER_LABEL (font-medium); cell titles stay font-normal.
 * Parent: CR-0003 / REQ-0034 + table typography polish
 */
"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TABLE_HEADER_LABEL } from "@/lib/ui/tableCellStyles";
import { cn } from "@/lib/utils";

export function SortableHeader<TData, TValue>({
  column,
  children,
  className,
}: {
  column: Column<TData, TValue>;
  children: ReactNode;
  className?: string;
}) {
  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "-ml-3 h-8 gap-1.5 hover:bg-gray-100 hover:text-dark-400",
        TABLE_HEADER_LABEL,
        className,
      )}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="size-3.5" aria-hidden />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3.5" aria-hidden />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
      )}
    </Button>
  );
}
