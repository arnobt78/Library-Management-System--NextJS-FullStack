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
 * - Matches BookOverview layout (header + body columns + hero glow slot)
 * - Matches BookCover wide variant dimensions
 * - Includes all sections: overview, video, summary, reviews
 * - Responsive layout matching (title → hero → details below md)
 *
 * Usage:
 * ```tsx
 * <BookSkeleton />
 * <BookSkeleton showDetails={false} /> // Only show overview section
 * ```
 *
 * Dimensions matched:
 * - BookCover wide: xs:w-[296px] w-[256px] xs:h-[404px] h-[354px]
 * - book-overview: header + body (details/hero with order)
 * - book-details: pt-8/12/16 (no bottom pad; related strip owns gap below)
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
      {/* Book Overview Section — mirrors BookOverviewContent structure */}
      <section className="book-overview">
        {/* Full-width title + meta header */}
        <header className="book-overview__header">
          <Skeleton className="h-12 w-3/4 sm:h-16 sm:w-4/5" />
          <div className="book-info mt-3 sm:mt-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-1 h-6 w-56" />
            <div className="mt-1 flex flex-row gap-1">
              <Skeleton className="size-[22px]" />
              <Skeleton className="h-6 w-8" />
            </div>
          </div>
        </header>

        <div className="book-overview__body">
          {/* Details column (order-2 below md) */}
          <div className="book-overview__details">
            {/* Book Details Section */}
            <div className="pt-4">
              <Skeleton className="mb-3 h-6 w-32" />
              <div className="book-info">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-36">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-36">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-36">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-36">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                </div>
              </div>
            </div>

            {/* Library Database Information — same gaps as Borrow Statistics */}
            <div className="book-info">
              <Skeleton className="mb-3 h-6 w-64" />
              <div className="w-full space-y-2 sm:space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-12 lg:gap-24">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-48" />
                </div>
              </div>
            </div>

            {/* Borrow Statistics — two-column grid (matches BookBorrowStats) */}
            <div className="book-info">
              <Skeleton className="mb-3 h-6 w-48" />
              <div className="w-full space-y-2 sm:space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-24">
                  <Skeleton className="h-5 w-52" />
                  <Skeleton className="h-5 w-48" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-24">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-5 w-52" />
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

          {/* Hero column (order-1 below md) */}
          <div className="book-overview__hero">
            <div className="relative z-10">
              <Skeleton
                className={cn(
                  "xs:w-[296px] w-[256px] xs:h-[404px] h-[354px]",
                  "z-10 shrink-0"
                )}
              />
              <Skeleton
                className={cn(
                  "absolute left-16 top-10 rotate-12 opacity-40 max-sm:hidden",
                  "xs:w-[296px] w-[256px] xs:h-[404px] h-[354px]"
                )}
              />
            </div>
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
