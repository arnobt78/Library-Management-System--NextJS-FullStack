import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * BookCardSkeleton Component
 *
 * A skeleton loader that matches the exact dimensions and layout of the BookCard component.
 * Used to show loading states while book data is being fetched.
 *
 * Features:
 * - Exact size matching to prevent layout shift
 * - Matches BookCover dimensions (regular variant)
 * - Matches text spacing and heights
 * - Supports isLoanedBook variant
 *
 * Usage:
 * ```tsx
 * <BookCardSkeleton />
 * <BookCardSkeleton isLoanedBook />
 * ```
 *
 * Dimensions matched:
 * - BookCover: xs:w-[174px] w-[114px] xs:h-[239px] h-[169px]
 * - Title: text-base/xl with mt-2
 * - Author: text-sm/base with mt-1
 * - Genre: text-sm/base with mt-1
 */
interface BookCardSkeletonProps {
  /**
   * If true, renders the skeleton for a loaned book variant
   * (includes calendar icon and button placeholders)
   */
  isLoanedBook?: boolean;
  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

const BookCardSkeleton: React.FC<BookCardSkeletonProps> = ({
  isLoanedBook = false,
  className,
}) => {
  return (
    <li className={cn(isLoanedBook && "xs:w-52 w-full", className)}>
      <div
        className={cn("flex flex-col", isLoanedBook && "w-full items-center")}
      >
        {/* Book Cover Skeleton - matches BookCover regular variant */}
        <Skeleton
          className={cn(
            "xs:w-[174px] w-[114px] xs:h-[239px] h-[169px]",
            "shrink-0"
          )}
        />

        {/* Text Content Skeleton */}
        <div
          className={cn(
            "mt-4 flex flex-col",
            !isLoanedBook && "xs:max-w-40 max-w-28"
          )}
        >
          {/* Title Skeleton - matches book-title class */}
          <Skeleton className="mt-2 h-5 w-full xs:h-6" />

          {/* Author Skeleton - matches book-author class */}
          <Skeleton className="mt-1 h-4 w-3/4 xs:h-5" />

          {/* Genre Skeleton - matches book-genre class */}
          <Skeleton className="mt-1 h-4 w-2/3 xs:h-5" />
        </div>

        {/* Loaned Book Additional Elements */}
        {isLoanedBook && (
          <div className="mt-3 flex w-full flex-col gap-3">
            {/* Calendar Icon + Text Skeleton */}
            <div className="flex flex-row items-center gap-1 max-xs:justify-center">
              <Skeleton className="size-[18px] shrink-0" />
              <Skeleton className="h-4 w-32" />
            </div>

            {/* Button Skeleton - matches book-btn */}
            <Skeleton className="min-h-14 w-full rounded-md" />
          </div>
        )}
      </div>
    </li>
  );
};

export default BookCardSkeleton;
