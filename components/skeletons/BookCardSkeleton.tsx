import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * BookCardSkeleton — centered cover + full-width reserved title/author + genre row.
 */
interface BookCardSkeletonProps {
  isLoanedBook?: boolean;
  className?: string;
}

const BookCardSkeleton: React.FC<BookCardSkeletonProps> = ({
  isLoanedBook = false,
  className,
}) => {
  return (
    <li className={cn("w-full", className)}>
      <div
        className={cn(
          "flex w-full flex-col items-center",
          isLoanedBook && "xs:w-52"
        )}
      >
        <Skeleton
          className={cn(
            "xs:w-[174px] w-[114px] xs:h-[239px] h-[169px]",
            "shrink-0"
          )}
        />

        <div className="mt-3 flex w-full flex-col items-center sm:mt-4">
          {/* Reserved 2-line title / author slots (matches .book-title / .book-author) */}
          <Skeleton className="mt-2 h-10 w-full max-w-full xs:h-[3.25rem]" />
          <Skeleton className="mt-1 h-9 w-4/5 xs:h-11" />
          <div className="mt-1 flex flex-row items-center justify-center gap-1">
            <Skeleton className="size-3.5 shrink-0 sm:size-4" />
            <Skeleton className="size-4 xs:size-5" />
            <Skeleton className="h-4 w-20 xs:h-5" />
          </div>
        </div>

        {isLoanedBook && (
          <div className="mt-3 flex w-full flex-col gap-3">
            <div className="flex flex-row items-center gap-1 max-xs:justify-center">
              <Skeleton className="size-[18px] shrink-0" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="min-h-14 w-full rounded-md" />
          </div>
        )}
      </div>
    </li>
  );
};

export default BookCardSkeleton;
