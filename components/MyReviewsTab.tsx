"use client";

/**
 * "My Reviews" — signed-in user's own book reviews (any moderation status).
 * Uses ReviewBookCard + review.write densify (patchReviewCaches) so CRUD
 * never flashes stale rows. Skips stale SSR when densify marked user-reviews empty.
 * Optional client period/status filters narrow the already-fetched list.
 * Parent: CR-0003 / REQ-0035 polish
 */

import { useMemo } from "react";
import { FilterX } from "lucide-react";
import { useUserBookReviews } from "@/hooks/useQueries";
import ReviewBookCard from "@/components/reviews/ReviewBookCard";
import { queryKeys } from "@/lib/query/keys";
import { isDensifiedEmpty } from "@/lib/utils/queryCacheLists";
import {
  filterReviews,
  hasNonDefaultProfileFilters,
  type ReviewStatusFilter,
} from "@/lib/profile/tabListFilters";
import type { ListPeriod } from "@/lib/ui/periodFilterOptions";
import { FILTER_CLEAR_GLASS_BTN_CLASS } from "@/lib/ui/filter-chip-styles";
import { cn } from "@/lib/utils";

export default function MyReviewsTab({
  userId,
  initialReviews,
  period = "all",
  statusFilter = "all",
  onClearFilters,
}: {
  userId: string;
  initialReviews?: AdminBookReviewItem[];
  period?: ListPeriod;
  statusFilter?: ReviewStatusFilter;
  onClearFilters?: () => void;
}) {
  const densifiedEmpty = isDensifiedEmpty(
    queryKeys.reviews.userReviews(userId),
  );
  const reviewsInitial = densifiedEmpty ? undefined : initialReviews;

  const { data: reviews = [], isLoading } = useUserBookReviews(
    userId,
    reviewsInitial,
  );

  const filtered = useMemo(
    () => filterReviews(reviews, period, statusFilter),
    [reviews, period, statusFilter],
  );

  const filtersActive = hasNonDefaultProfileFilters({
    period,
    status: statusFilter,
  });

  if (isLoading && reviews.length === 0 && !densifiedEmpty) {
    return (
      <div className="space-y-2 sm:space-y-4">
        {[...Array(2)].map((_, i) => (
          <div
            key={`my-review-sk-${i}`}
            className="h-28 animate-pulse rounded-2xl border border-white/10 bg-dark-300/40"
          />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="profile-borrow-row p-4 text-center sm:p-6">
        <p className="text-sm text-light-200 sm:text-base">
          You haven&apos;t written any reviews yet. Reviews appear here as soon
          as you submit one — pending admin moderation before other readers can
          see it.
        </p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div
        role="status"
        className="profile-borrow-row p-4 text-center sm:p-6"
      >
        <p className="text-sm text-light-200 sm:text-base">
          No reviews found matching your filters.
        </p>
        {filtersActive && onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className={cn(FILTER_CLEAR_GLASS_BTN_CLASS, "mt-3 sm:mt-4")}
          >
            <FilterX className="size-4" aria-hidden />
            Clear Filters
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-4">
      {filtered.map((review) => (
        <ReviewBookCard key={review.id} review={review} />
      ))}
    </div>
  );
}
