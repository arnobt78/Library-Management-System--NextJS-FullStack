import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartSkeletonProps {
  /**
   * The type of chart skeleton to display.
   * "line" for line charts, "bar" for bar charts, "pie" for pie charts.
   * @default "line"
   */
  variant?: "line" | "bar" | "pie";
  /**
   * The height of the chart skeleton in pixels.
   * @default 300
   */
  height?: number;
  /**
   * Additional CSS classes to apply to the container.
   */
  className?: string;
}

/**
 * ChartSkeleton Component
 *
 * A skeleton loader that matches the exact dimensions and layout of chart components.
 * Used to show loading states while analytics data is being fetched.
 *
 * Features:
 * - Three variants: "line", "bar", and "pie"
 * - Exact size matching to prevent layout shift
 * - Matches chart container dimensions
 * - Responsive layout matching
 *
 * Usage:
 * ```tsx
 * // Line chart skeleton
 * <ChartSkeleton variant="line" height={300} />
 *
 * // Bar chart skeleton
 * <ChartSkeleton variant="bar" height={300} />
 *
 * // Pie chart skeleton
 * <ChartSkeleton variant="pie" height={300} />
 * ```
 */
const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  variant = "line",
  height = 300,
  className,
}) => {
  if (variant === "pie") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Skeleton className="size-64 rounded-full" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Chart area */}
      <Skeleton className="w-full" style={{ height: `${height}px` }} />
      {/* X-axis labels */}
      <div className="flex justify-between px-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
};

export default ChartSkeleton;

