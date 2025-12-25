import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * GenericCardSkeleton Component
 *
 * A skeleton loader that matches the exact dimensions and layout of generic card components.
 * Used to show loading states while card data is being fetched.
 *
 * Features:
 * - Exact size matching to prevent layout shift
 * - Supports different card layouts (with/without header, with/without footer)
 * - Matches standard card dimensions
 * - Flexible content area
 * - Responsive layout matching
 *
 * Usage:
 * ```tsx
 * // Standard card skeleton
 * <GenericCardSkeleton />
 *
 * // Card with header
 * <GenericCardSkeleton showHeader={true} />
 *
 * // Card with custom content
 * <GenericCardSkeleton contentLines={5} />
 *
 * // Card with footer
 * <GenericCardSkeleton showFooter={true} />
 * ```
 *
 * Dimensions matched:
 * - Card: rounded-lg border bg-white p-4 sm:p-6 shadow-sm
 * - Card header: mb-4
 * - Card content: space-y-2 or space-y-3
 * - Card footer: mt-4 pt-4 border-t
 */
interface GenericCardSkeletonProps {
  /**
   * Whether to show card header
   * Default: false
   */
  showHeader?: boolean;
  /**
   * Whether to show card footer
   * Default: false
   */
  showFooter?: boolean;
  /**
   * Number of content lines to display
   * Default: 3
   */
  contentLines?: number;
  /**
   * Height of each content line
   * Default: 4 (h-4)
   */
  lineHeight?: number;
  /**
   * Whether to use Card component wrapper
   * Default: true
   */
  useCardWrapper?: boolean;
  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

const GenericCardSkeleton: React.FC<GenericCardSkeletonProps> = ({
  showHeader = false,
  showFooter = false,
  contentLines = 3,
  lineHeight = 4,
  useCardWrapper = true,
  className,
}) => {
  const content = (
    <>
      {/* Card Header */}
      {showHeader && (
        <div className="mb-4">
          <Skeleton className="h-6 w-40" />
        </div>
      )}

      {/* Card Content */}
      <div className="space-y-2">
        {Array.from({ length: contentLines }).map((_, i) => {
          const heightClass =
            lineHeight === 3
              ? "h-3"
              : lineHeight === 4
                ? "h-4"
                : lineHeight === 5
                  ? "h-5"
                  : lineHeight === 6
                    ? "h-6"
                    : "h-4";
          return (
            <Skeleton
              key={`line-${i}`}
              className={cn(
                heightClass,
                i === contentLines - 1 ? "w-3/4" : "w-full"
              )}
            />
          );
        })}
      </div>

      {/* Card Footer */}
      {showFooter && (
        <div className="mt-4 space-y-2 border-t pt-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      )}
    </>
  );

  if (useCardWrapper) {
    return (
      <Card
        className={cn(
          "rounded-lg border bg-white p-4 sm:p-6 shadow-sm",
          className
        )}
      >
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4 sm:p-6 shadow-sm",
        className
      )}
    >
      {content}
    </div>
  );
};

export default GenericCardSkeleton;
