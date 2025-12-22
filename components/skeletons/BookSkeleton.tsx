import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * BookSkeleton Component
 *
 * A skeleton loader that matches the exact dimensions and layout of the BookOverview component
 * and the book detail page sections (Video, Summary, Reviews).
 * Used to show loading states while book data is being fetched.
 *
 * Features:
 * - Exact size matching to prevent layout shift
 * - Matches BookOverview layout (book-overview class)
 * - Matches BookCover wide variant dimensions
 * - Includes all sections: overview, video, summary, reviews
 * - Responsive layout matching
 *
 * Usage:
 * ```tsx
 * <BookSkeleton />
 * <BookSkeleton showDetails={false} /> // Only show overview section
 * ```
 *
 * Dimensions matched:
 * - BookCover wide: xs:w-[296px] w-[256px] xs:h-[404px] h-[354px]
 * - book-overview: flex-col-reverse sm:flex-row
 * - book-details: py-16 flex flex-col gap-16 lg:flex-row
 */
interface BookSkeletonProps {
  /**
   * If true, includes the book-details section (Video, Summary, Reviews)
   * Default: true
   */
  showDetails?: boolean;
  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

const BookSkeleton: React.FC<BookSkeletonProps> = ({
  showDetails = true,
  className,
}) => {
  return (
    <div className={className}>
      {/* Book Overview Section */}
      <section className="book-overview">
        {/* Left Side - Book Information */}
        <div className="flex flex-1 flex-col gap-5">
          {/* Title */}
          <Skeleton className="h-12 w-3/4 sm:h-16" />

          {/* Book Info Section (Author, Category, Rating) */}
          <div className="book-info">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-1 h-6 w-56" />
            <div className="mt-1 flex flex-row gap-1">
              <Skeleton className="size-[22px]" />
              <Skeleton className="h-6 w-8" />
            </div>
          </div>

          {/* Book Details Section */}
          <div className="pt-4">
            <Skeleton className="mb-3 h-6 w-32" />
            <div className="book-info">
              <div className="space-y-3">
                {/* First row: ISBN and Published */}
                <div className="grid grid-cols-2 gap-36">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-40" />
                </div>

                {/* Second row: Publisher and Language */}
                <div className="grid grid-cols-2 gap-36">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-40" />
                </div>

                {/* Third row: Pages and Edition */}
                <div className="grid grid-cols-2 gap-36">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-40" />
                </div>

                {/* Fourth row: Total Copies and Available Copies */}
                <div className="grid grid-cols-2 gap-36">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-40" />
                </div>
              </div>
            </div>
          </div>

          {/* Library Database Information Section */}
          <div className="book-info">
            <Skeleton className="mb-3 h-6 w-64" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-12">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
          </div>

          {/* Borrow Statistics Section */}
          <div className="book-info">
            <Skeleton className="mb-3 h-6 w-48" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-24">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="grid grid-cols-2 gap-24">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-56" />
              </div>
            </div>
          </div>

          {/* Description */}
          <Skeleton className="book-description h-24 w-full" />

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Skeleton className="min-h-14 w-40 rounded-md" />
            <Skeleton className="min-h-14 w-32 rounded-md" />
          </div>
        </div>

        {/* Right Side - Book Cover */}
        <div className="relative flex flex-1 justify-center">
          <div className="relative">
            {/* Main Book Cover - wide variant */}
            <Skeleton
              className={cn(
                "xs:w-[296px] w-[256px] xs:h-[404px] h-[354px]",
                "z-10 shrink-0"
              )}
            />

            {/* Decorative Rotated Cover (hidden on mobile) */}
            <Skeleton
              className={cn(
                "absolute left-16 top-10 rotate-12 opacity-40 max-sm:hidden",
                "xs:w-[296px] w-[256px] xs:h-[404px] h-[354px]"
              )}
            />
          </div>
        </div>
      </section>

      {/* Book Details Section (Video, Summary, Reviews) */}
      {showDetails && (
        <div className="book-details">
          <div className="flex-[1.5]">
            {/* Video Section */}
            <section className="flex flex-col gap-7">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </section>

            {/* Summary Section */}
            <section className="mt-10 flex flex-col gap-7">
              <Skeleton className="h-7 w-32" />
              <div className="space-y-5">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-6 w-full" />
              </div>
            </section>

            {/* Reviews Section */}
            <section className="mt-10 flex flex-col gap-7">
              <Skeleton className="h-7 w-32" />
              <div className="space-y-4">
                {/* Review Card Skeletons */}
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-200 bg-gray-800/50 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="mb-2 flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Skeleton key={star} className="size-4" />
                          ))}
                        </div>
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookSkeleton;
