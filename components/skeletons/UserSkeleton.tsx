import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * UserSkeleton Component
 *
 * A skeleton loader that matches the exact dimensions and layout of user display components.
 * Supports both table row format (for admin users page) and card format (for account requests).
 * Used to show loading states while user data is being fetched.
 *
 * Features:
 * - Exact size matching to prevent layout shift
 * - Supports table row format (variant="table")
 * - Supports card format (variant="card")
 * - Matches avatar, badges, and button dimensions
 * - Responsive layout matching
 *
 * Usage:
 * ```tsx
 * // Table row skeleton
 * <UserSkeleton variant="table" />
 *
 * // Card skeleton
 * <UserSkeleton variant="card" />
 * ```
 *
 * Dimensions matched:
 * - Avatar: size-12 (48px)
 * - Badge: rounded-full px-2 py-1 text-xs
 * - Table row: px-4 py-2
 * - Card: Card with CardHeader and CardContent
 */
interface UserSkeletonProps {
  /**
   * Display variant: "table" for table rows, "card" for card layout
   * Default: "table"
   */
  variant?: "table" | "card";
  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

const UserSkeleton: React.FC<UserSkeletonProps> = ({
  variant = "table",
  className,
}) => {
  if (variant === "card") {
    return (
      <Card className={cn("border-0 shadow-md", className)}>
        <CardHeader className="pb-4">
          <div className="flex items-start">
            <div className="flex flex-1 items-center space-x-3">
              {/* Avatar Skeleton - size-12 */}
              <Skeleton className="size-12 shrink-0 rounded-full" />

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  {/* Name Skeleton */}
                  <Skeleton className="h-6 w-32" />

                  {/* Badge Skeleton */}
                  <Skeleton className="ml-2 h-5 w-20 rounded-full" />
                </div>

                {/* Email with icon Skeleton */}
                <div className="mt-1 flex items-center space-x-1">
                  <Skeleton className="size-3" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* University ID with icon */}
          <div className="flex items-center space-x-2">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Join Date with icon */}
          <div className="flex items-center space-x-2">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* University Card Section */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            {/* University Card Image Skeleton - h-32 w-full */}
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 flex-1 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Table row variant
  return (
    <tr className={cn("hover:bg-gray-50", className)}>
      {/* Name */}
      <td className="border border-gray-200 px-4 py-2">
        <Skeleton className="h-5 w-32" />
      </td>

      {/* Email */}
      <td className="border border-gray-200 px-4 py-2">
        <Skeleton className="h-5 w-48" />
      </td>

      {/* University ID */}
      <td className="border border-gray-200 px-4 py-2">
        <Skeleton className="h-5 w-20" />
      </td>

      {/* Role Badge */}
      <td className="border border-gray-200 px-4 py-2">
        <Skeleton className="h-6 w-16 rounded-full" />
      </td>

      {/* Status Badge */}
      <td className="border border-gray-200 px-4 py-2">
        <Skeleton className="h-6 w-20 rounded-full" />
      </td>

      {/* Joined Date */}
      <td className="border border-gray-200 px-4 py-2">
        <Skeleton className="h-5 w-24" />
      </td>

      {/* Actions */}
      <td className="border border-gray-200 px-4 py-2">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </td>
    </tr>
  );
};

export default UserSkeleton;

