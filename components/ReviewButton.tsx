"use client";

/**
 * ReviewButton Component
 *
 * Button component for reviewing books. Uses React Query hook for eligibility check.
 * Integrates with useReviewEligibility hook and useCreateReview mutation.
 *
 * Features:
 * - Uses useReviewEligibility hook for eligibility check
 * - Shows loading state while checking eligibility
 * - Displays appropriate button state based on eligibility
 * - Opens ReviewFormDialog when eligible
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ReviewFormDialog from "@/components/ReviewFormDialog";
import { MessageCircle } from "lucide-react";
import { useReviewEligibility } from "@/hooks/useQueries";
import type { ReviewEligibility } from "@/lib/services/reviews";

interface ReviewButtonProps {
  bookId: string;
  userId: string;
  /**
   * Initial review eligibility from SSR (prevents duplicate fetch, ensures correct button state on first load)
   */
  initialReviewEligibility?: ReviewEligibility;
}

export default function ReviewButton({
  bookId,
  userId: _userId,
  initialReviewEligibility,
}: ReviewButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  // Use React Query hook for eligibility check with SSR initial data
  const { data: eligibility, isLoading } = useReviewEligibility(
    bookId,
    initialReviewEligibility
  );

  const canReview = eligibility?.canReview || false;
  const hasExistingReview = eligibility?.hasExistingReview || false;
  const isCurrentlyBorrowed = eligibility?.isCurrentlyBorrowed || false;

  const handleReviewSubmitted = () => {
    setShowDialog(false);
    // CRITICAL: No manual invalidation needed here
    // The useCreateReview mutation in ReviewFormDialog already handles
    // all cache invalidation via invalidateAfterReviewChange()
    // which invalidates reviews, books, and analytics queries
    // Manual invalidation here would cause redundant refetches
  };

  if (isLoading) {
    return (
      <Button
        disabled
        className="flex items-center gap-1.5 border-gray-600 bg-gray-700/50 text-light-200/50 sm:gap-2"
      >
        <MessageCircle className="size-4 text-light-200/50 sm:size-5" />
        <p className="font-bebas-neue text-base text-light-200/50 sm:text-xl">Loading...</p>
      </Button>
    );
  }

  if (hasExistingReview) {
    return (
      <Button
        disabled
        className="hover:bg-primary/90 mt-3 min-h-12 w-full bg-primary text-dark-100 sm:mt-4 sm:min-h-14 sm:w-fit"
      >
        <MessageCircle className="size-4 text-dark-100 sm:size-6" />
        <p className="font-bebas-neue text-base text-dark-100 sm:text-xl">
          Review Submitted
        </p>
      </Button>
    );
  }

  if (!canReview) {
    return (
      <Button
        disabled
        className="hover:bg-primary/90 mt-3 min-h-12 w-full bg-primary text-dark-100 sm:mt-4 sm:min-h-14 sm:w-fit"
      >
        <MessageCircle className="size-4 text-dark-100 sm:size-6" />
        <p className="font-bebas-neue text-base text-dark-100 sm:text-xl">
          {isCurrentlyBorrowed
            ? "Return Borrow Book to Review"
            : "Borrow Book to Review"}
        </p>
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="hover:bg-primary/90 mt-3 min-h-12 w-full bg-primary text-dark-100 sm:mt-4 sm:min-h-14 sm:w-fit"
      >
        <MessageCircle className="size-4 text-dark-100 sm:size-6" />
        <p className="font-bebas-neue text-base text-dark-100 sm:text-xl">
          Review This Book
        </p>
      </Button>

      <ReviewFormDialog
        bookId={bookId}
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </>
  );
}
