"use client";

/**
 * "My Reviews" — signed-in user's own book reviews (any moderation status).
 * Uses ReviewBookCard + review.write densify (patchReviewCaches) so CRUD
 * never flashes stale rows. Skips stale SSR when densify marked user-reviews empty.
 * Parent: CR-0003 / REQ-0035 polish
 */

import { useUserBookReviews } from "@/hooks/useQueries";
import ReviewBookCard from "@/components/reviews/ReviewBookCard";
import { queryKeys } from "@/lib/query/keys";
import { isDensifiedEmpty } from "@/lib/utils/queryCacheLists";

export default function MyReviewsTab({
  userId,
  initialReviews,
}: {
  userId: string;
  initialReviews?: AdminBookReviewItem[];
}) {
  const densifiedEmpty = isDensifiedEmpty(
    queryKeys.reviews.userReviews(userId),
  );
  const reviewsInitial = densifiedEmpty ? undefined : initialReviews;

  const { data: reviews = [], isLoading } = useUserBookReviews(
    userId,
    reviewsInitial,
  );

  if (isLoading && reviews.length === 0 && !densifiedEmpty) {
    return (
      <div className="space-y-3 sm:space-y-4">
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

  return (
    <div className="space-y-3 sm:space-y-4">
      {reviews.map((review) => (
        <ReviewBookCard key={review.id} review={review} />
      ))}
    </div>
  );
}
