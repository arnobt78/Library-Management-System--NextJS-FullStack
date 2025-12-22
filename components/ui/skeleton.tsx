import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton Component
 * 
 * A loading placeholder component that displays an animated shimmer effect.
 * Used to show loading states while data is being fetched.
 * 
 * Features:
 * - Animated shimmer effect for visual feedback
 * - Customizable size via className
 * - Exact size matching to prevent layout shift
 * 
 * Usage:
 * ```tsx
 * <Skeleton className="h-4 w-[250px]" />
 * <Skeleton className="h-12 w-12 rounded-full" />
 * ```
 * 
 * For exact size matching:
 * - Measure the actual component dimensions
 * - Apply the same height/width classes to the skeleton
 * - This prevents layout shift when data loads
 */
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "animate-pulse rounded-md bg-muted", // Base styles: pulse animation, rounded corners, muted background
      className
    )}
    {...props}
  />
));
Skeleton.displayName = "Skeleton";

export { Skeleton };

