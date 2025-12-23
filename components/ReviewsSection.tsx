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
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-4 ${
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
    <div className="rounded-lg border border-gray-200 bg-gray-800/50 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h4 className="font-medium text-light-100">
              {review.userFullName}
            </h4>
            <StarRating rating={review.rating} />
          </div>

          <p className="mt-2 text-light-200">{review.comment}</p>

          <div className="mt-3 flex items-center justify-between text-xs text-light-200/70">
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
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-full p-1 text-light-200/60 hover:bg-gray-700/50 hover:text-light-100"
            >
              <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-10 w-32 rounded-md border border-gray-600 bg-gray-800 py-1 shadow-lg">
                <button
                  onClick={() => {
                    onEdit(review);
                    setShowMenu(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-light-100 hover:bg-gray-700"
                >
                  Edit
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="block w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700">
                      Delete
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-gray-600 bg-gray-800/95">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-light-100">
                        Delete Review
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-light-200">
                        Are you sure you want to delete this review? This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-gray-500 bg-gray-600 text-white hover:bg-gray-500 hover:text-white">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <button
                  onClick={() => setShowMenu(false)}
                  className="block w-full px-3 py-2 text-left text-sm text-light-100 hover:bg-gray-700"
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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-light-100">
        Reviews ({reviews.length})
      </h3>

      {reviews.length === 0 ? (
        <div className="rounded-lg border border-gray-600 bg-gray-800/30 p-8 text-center">
          <p className="text-light-200/70">
            No reviews yet. Be the first to review this book!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          className="transition-colors hover:scale-110"
        >
          <Star
            className={`size-6 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-300 text-gray-300"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-light-200/70">
        {rating} star{rating !== 1 ? "s" : ""}
      </span>
    </div>
  );

  return (
    <div className="rounded-lg border border-gray-600 bg-gray-800/50 p-6">
      <h3 className="mb-4 text-lg font-semibold text-light-100">
        Edit Your Review
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-light-200">
            Rating
          </label>
          <StarRating />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-light-200">
            Your Review
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about this book..."
            className="w-full rounded-md border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm text-light-100 placeholder:text-light-200/50 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400"
            rows={4}
            required
          />
          <p className="mt-1 text-xs text-light-200/70">
            {comment.length}/500 characters
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={updateReviewMutation.isPending}
            className="border-gray-600 text-light-200 hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateReviewMutation.isPending || !comment.trim()}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {updateReviewMutation.isPending ? "Updating..." : "Update Review"}
          </Button>
        </div>
      </form>
    </div>
  );
}
