"use client";

/**
 * ReviewsSection Component
 *
 * Component for displaying and managing book reviews. Uses React Query mutations.
 * Integrates with useDeleteReview and useUpdateReview mutations for proper cache invalidation.
 *
 * Features:
 * - Uses useDeleteReview and useUpdateReview mutations
 * - Automatic cache invalidation on success
 * - Toast notifications via mutation callbacks
 * - No page reloads - uses cache invalidation instead
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useDeleteReview, useUpdateReview } from "@/hooks/useMutations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  userFullName: string;
  userEmail: string;
}

interface ReviewCardProps {
  review: Review;
  currentUserEmail?: string;
  onEdit: (review: Review) => void;
  onDelete: (reviewId: string) => void;
}

function ReviewCard({
  review,
  currentUserEmail,
  onEdit,
  onDelete,
}: ReviewCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Use React Query mutation for deleting review
  const deleteReviewMutation = useDeleteReview();

  const isOwner = currentUserEmail === review.userEmail;
  const isEdited =
    review.createdAt &&
    review.updatedAt &&
    new Date(review.createdAt).getTime() !==
      new Date(review.updatedAt).getTime();

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5 sm:space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-3 sm:size-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-300 text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  const handleDelete = () => {
    // Use mutation to delete review
    deleteReviewMutation.mutate(
      {
        reviewId: review.id,
      },
      {
        onSuccess: () => {
          onDelete(review.id);
          setShowMenu(false);
        },
      }
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-800/50 p-3 shadow-sm sm:p-4">
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <h4 className="text-sm font-medium text-light-100 sm:text-base">
              {review.userFullName}
            </h4>
            <StarRating rating={review.rating} />
          </div>

          <p className="mt-2 text-sm text-light-200 sm:text-base">
            {review.comment}
          </p>

          <div className="mt-2 flex flex-col gap-1 text-[10px] text-light-200/70 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
            <span>
              Created:{" "}
              {review.createdAt
                ? new Date(review.createdAt).toLocaleString()
                : "N/A"}
            </span>
            {isEdited && (
              <span>
                Edited:{" "}
                {review.updatedAt
                  ? new Date(review.updatedAt).toLocaleString()
                  : "N/A"}
              </span>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-full p-1 text-light-200/60 hover:bg-gray-700/50 hover:text-light-100"
            >
              <svg className="size-4 sm:size-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-10 w-28 rounded-md border border-gray-600 bg-gray-800 py-1 shadow-lg sm:w-32">
                <button
                  onClick={() => {
                    onEdit(review);
                    setShowMenu(false);
                  }}
                  className="block w-full px-2.5 py-1.5 text-left text-xs text-light-100 hover:bg-gray-700 sm:px-3 sm:py-2 sm:text-sm"
                >
                  Edit
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="block w-full px-2.5 py-1.5 text-left text-xs text-red-400 hover:bg-gray-700 sm:px-3 sm:py-2 sm:text-sm">
                      Delete
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-gray-600 bg-gray-800/95">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-base text-light-100 sm:text-lg">
                        Delete Review
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-xs text-light-200 sm:text-sm">
                        Are you sure you want to delete this review? This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
                      <AlertDialogCancel className="w-full border-gray-500 bg-gray-600 text-xs text-white hover:bg-gray-500 hover:text-white sm:w-auto sm:text-sm">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="w-full bg-red-600 text-xs text-white hover:bg-red-700 sm:w-auto sm:text-sm"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <button
                  onClick={() => setShowMenu(false)}
                  className="block w-full px-2.5 py-1.5 text-left text-xs text-light-100 hover:bg-gray-700 sm:px-3 sm:py-2 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ReviewsSectionProps {
  bookId: string;
  reviews: Review[];
  currentUserEmail?: string | null;
}

export default function ReviewsSection({
  bookId: _bookId,
  reviews,
  currentUserEmail,
}: ReviewsSectionProps) {
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  const handleReviewEdit = (review: Review) => {
    setEditingReview(review);
  };

  const handleReviewDelete = () => {
    // CRITICAL: No manual invalidation needed here
    // The useDeleteReview mutation already handles all cache invalidation
    // via invalidateAfterReviewChange() which invalidates reviews, books, and analytics
    // Manual invalidation here would cause redundant refetches
  };

  const handleReviewUpdate = () => {
    setEditingReview(null);
    // CRITICAL: No manual invalidation needed here
    // The useUpdateReview mutation already handles all cache invalidation
    // via invalidateAfterReviewChange() which invalidates reviews, books, and analytics
    // Manual invalidation here would cause redundant refetches
  };

  if (editingReview) {
    return (
      <EditReviewForm
        review={editingReview}
        onCancel={() => setEditingReview(null)}
        onUpdate={handleReviewUpdate}
      />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-base font-semibold text-light-100 sm:text-lg">
        Reviews ({reviews.length})
      </h3>

      {reviews.length === 0 ? (
        <div className="rounded-lg border border-gray-600 bg-gray-800/30 p-4 text-center sm:p-8">
          <p className="text-sm text-light-200/70 sm:text-base">
            No reviews yet. Be the first to review this book!
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserEmail={currentUserEmail || undefined}
              onEdit={handleReviewEdit}
              onDelete={handleReviewDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Edit Review Form Component
interface EditReviewFormProps {
  review: Review;
  onCancel: () => void;
  onUpdate: () => void;
}

function EditReviewForm({ review, onCancel, onUpdate }: EditReviewFormProps) {
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment);

  // Use React Query mutation for updating review
  const updateReviewMutation = useUpdateReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim()) {
      return; // Validation handled by mutation
    }

    // Use mutation to update review
    updateReviewMutation.mutate(
      {
        reviewId: review.id,
        rating,
        comment: comment.trim(),
      },
      {
        onSuccess: () => {
          onUpdate();
        },
      }
    );
  };

  const StarRating = () => (
    <div className="flex items-center gap-0.5 sm:space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          className="transition-colors hover:scale-110"
        >
          <Star
            className={`size-5 sm:size-6 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-300 text-gray-300"
            }`}
          />
        </button>
      ))}
      <span className="ml-1.5 text-xs text-light-200/70 sm:ml-2 sm:text-sm">
        {rating} star{rating !== 1 ? "s" : ""}
      </span>
    </div>
  );

  return (
    <div className="rounded-lg border border-gray-600 bg-gray-800/50 p-4 sm:p-6">
      <h3 className="mb-3 text-base font-semibold text-light-100 sm:mb-4 sm:text-lg">
        Edit Your Review
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-light-200 sm:mb-2 sm:text-sm">
            Rating
          </label>
          <StarRating />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-light-200 sm:mb-2 sm:text-sm">
            Your Review
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about this book..."
            className="w-full rounded-md border border-gray-600 bg-gray-700/50 px-2.5 py-1.5 text-xs text-light-100 placeholder:text-light-200/50 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400 sm:px-3 sm:py-2 sm:text-sm"
            rows={4}
            required
          />
          <p className="mt-1 text-[10px] text-light-200/70 sm:text-xs">
            {comment.length}/500 characters
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-3 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={updateReviewMutation.isPending}
            className="w-full border-gray-600 bg-gray-700/50 text-xs text-light-100 hover:bg-gray-700 hover:text-white sm:w-auto sm:text-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateReviewMutation.isPending || !comment.trim()}
            className="w-full bg-green-600 text-xs text-white hover:bg-green-700 sm:w-auto sm:text-sm"
          >
            {updateReviewMutation.isPending ? "Updating..." : "Update Review"}
          </Button>
        </div>
      </form>
    </div>
  );
}
