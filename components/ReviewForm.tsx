"use client";

/**
 * ReviewForm Component
 *
 * Form component for submitting book reviews. Uses React Query mutation.
 * Integrates with useCreateReview mutation for proper cache invalidation.
 *
 * Features:
 * - Uses useCreateReview mutation
 * - Automatic cache invalidation on success
 * - Toast notifications via mutation callbacks
 * - Form validation
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreateReview } from "@/hooks/useMutations";

interface ReviewFormProps {
  bookId: string;
  onReviewSubmitted: () => void;
  onCancel: () => void;
}

export default function ReviewForm({
  bookId,
  onReviewSubmitted,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  // Use React Query mutation for creating review
  const createReviewMutation = useCreateReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim()) {
      return; // Validation handled by mutation
    }

    // Use mutation to create review
    createReviewMutation.mutate(
      {
        bookId,
        rating,
        comment: comment.trim(),
      },
      {
        onSuccess: () => {
          onReviewSubmitted();
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
          className={`text-2xl transition-colors ${
            star <= rating ? "text-yellow-400" : "text-gray-300"
          } hover:text-yellow-400`}
        >
          ⭐
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-600">
        {rating} star{rating !== 1 ? "s" : ""}
      </span>
    </div>
  );

  return (
    <div className="rounded-lg border border-gray-600 bg-gray-800/50 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-light-100">
        Write a Review
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
            disabled={createReviewMutation.isPending}
            className="border-gray-600 text-light-200 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createReviewMutation.isPending || !comment.trim()}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </form>
    </div>
  );
}
