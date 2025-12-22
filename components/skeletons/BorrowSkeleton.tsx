import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * BorrowSkeleton Component
 *
 * A skeleton loader that matches the exact dimensions and layout of borrow record display components.
 * Supports both admin book requests format (simple card) and user profile format (detailed card).
 * Used to show loading states while borrow data is being fetched.
 *
 * Features:
 * - Exact size matching to prevent layout shift
 * - Supports admin format (variant="admin")
 * - Supports profile format (variant="profile")
 * - Matches book cover, badges, icons, and button dimensions
 * - Responsive layout matching
 *
 * Usage:
 * ```tsx
 * // Admin book requests skeleton
 * <BorrowSkeleton variant="admin" />
 *
 * // User profile borrow card skeleton
 * <BorrowSkeleton variant="profile" />
 * ```
 *
 * Dimensions matched:
 * - Admin: Book cover h-20 w-16
 * - Profile: Book cover w-48 (full height)
 * - Badges: rounded-full px-2 py-1 text-xs
 * - Icons: size-4
 */
interface BorrowSkeletonProps {
  /**
   * Display variant: "admin" for admin book requests page, "profile" for user profile page
   * Default: "admin"
   */
  variant?: "admin" | "profile";
  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

const BorrowSkeleton: React.FC<BorrowSkeletonProps> = ({
  variant = "admin",
  className,
}) => {
  if (variant === "profile") {
    return (
      <Card className={cn("mb-3 border-2", className)}>
        <CardContent className="p-3">
          <div className="flex gap-3">
            {/* Book Cover Skeleton - w-48, full height */}
            <div className="relative w-48 shrink-0">
              <Skeleton className="size-full" />
            </div>

            {/* Main Content */}
            <div className="min-w-0 flex-1">
              {/* Header with Status Badge */}
              <div className="mb-2 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  {/* Title */}
                  <Skeleton className="mb-1 h-7 w-3/4" />
                  {/* Author */}
                  <Skeleton className="h-5 w-1/2" />
                </div>
                {/* Status Badge */}
                <Skeleton className="ml-2 h-6 w-20 shrink-0 rounded-full" />
              </div>

              {/* Genre and Rating */}
              <div className="mb-2 flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-md" />
                <div className="flex items-center gap-1">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>

              {/* Compact Information with Icons */}
              <div className="mb-2 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>

              {/* Status Message */}
              <div className="mb-2">
                <Skeleton className="h-8 w-48 rounded" />
              </div>

              {/* Fine and User Info */}
              <div className="mb-2 flex flex-wrap gap-2">
                <Skeleton className="h-6 w-32 rounded" />
                <div className="flex items-center gap-1">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32 rounded-md" />
                <Skeleton className="h-10 w-24 rounded-md" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Admin variant
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 p-4 hover:bg-gray-50",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Book Cover Skeleton - h-20 w-16 */}
        <div className="shrink-0">
          <Skeleton className="h-20 w-16" />
        </div>

        {/* Request Details */}
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Book Details */}
            <div>
              {/* Title */}
              <Skeleton className="mb-1 h-6 w-3/4" />
              {/* Author */}
              <Skeleton className="mb-1 h-4 w-1/2" />
              {/* Genre */}
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Borrower Details */}
            <div>
              {/* Borrower Details Header */}
              <Skeleton className="mb-1 h-5 w-32" />
              {/* Name */}
              <Skeleton className="mb-1 h-4 w-40" />
              {/* Email */}
              <Skeleton className="mb-1 h-4 w-48" />
              {/* University ID */}
              <Skeleton className="h-4 w-28" />
            </div>
          </div>

          {/* Dates Grid */}
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div>
              <Skeleton className="mb-1 h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div>
              <Skeleton className="mb-1 h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div>
              <Skeleton className="mb-1 h-4 w-16" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorrowSkeleton;
