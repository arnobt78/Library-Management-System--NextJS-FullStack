import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * TableSkeleton Component
 *
 * A skeleton loader that matches the exact dimensions and layout of table components.
 * Used to show loading states while table data is being fetched.
 *
 * Features:
 * - Exact size matching to prevent layout shift
 * - Configurable number of columns and rows
 * - Matches table structure (thead, tbody, borders, padding)
 * - Supports custom column widths
 * - Responsive layout matching
 *
 * Usage:
 * ```tsx
 * // Basic table skeleton (7 columns, 5 rows)
 * <TableSkeleton columns={7} rows={5} />
 *
 * // Custom column widths
 * <TableSkeleton
 *   columns={5}
 *   rows={3}
 *   columnWidths={["w-32", "w-48", "w-24", "w-32", "w-40"]}
 * />
 *
 * // Without header
 * <TableSkeleton columns={4} rows={5} showHeader={false} />
 * ```
 *
 * Dimensions matched:
 * - Table: w-full border-collapse border border-gray-200
 * - Thead tr: bg-gray-50
 * - Th/Td: border border-gray-200 px-4 py-2 text-left
 * - Tbody tr: hover:bg-gray-50
 */
interface TableSkeletonProps {
  /**
   * Number of columns in the table
   * Default: 7
   */
  columns?: number;
  /**
   * Number of rows in the table body
   * Default: 5
   */
  rows?: number;
  /**
   * Optional array of width classes for each column
   * If not provided, columns will have default widths
   * Example: ["w-32", "w-48", "w-24"]
   */
  columnWidths?: string[];
  /**
   * Whether to show the table header
   * Default: true
   */
  showHeader?: boolean;
  /**
   * Additional CSS classes to apply to the table
   */
  className?: string;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns = 7,
  rows = 5,
  columnWidths,
  showHeader = true,
  className,
}) => {
  // Generate default column widths if not provided
  const getColumnWidth = (index: number): string => {
    if (columnWidths && columnWidths[index]) {
      return columnWidths[index];
    }
    // Default widths based on common table patterns
    const defaultWidths = [
      "w-32", // Name/Title
      "w-48", // Email/Description
      "w-24", // ID/Number
      "w-20", // Badge/Status
      "w-20", // Badge/Role
      "w-24", // Date
      "w-40", // Actions
    ];
    return defaultWidths[index] || "w-32";
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full border-collapse border border-gray-200",
            className
          )}
        >
          {showHeader && (
            <thead>
              <tr className="bg-gray-50">
                {Array.from({ length: columns }).map((_, index) => (
                  <th
                    key={index}
                    className="border border-gray-200 px-4 py-2 text-left"
                  >
                    <Skeleton className={cn("h-5", getColumnWidth(index))} />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className="border border-gray-200 px-4 py-2"
                  >
                    {/* Vary skeleton heights for visual interest */}
                    <Skeleton
                      className={cn(
                        "h-5",
                        getColumnWidth(colIndex),
                        // Make some cells slightly different (badges, buttons)
                        colIndex === columns - 1 && "h-8 w-24", // Actions column
                        (colIndex === columns - 2 ||
                          colIndex === columns - 3) && "h-6 w-20 rounded-full" // Badge columns
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableSkeleton;

