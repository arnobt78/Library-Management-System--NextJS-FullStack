"use client";

/**
 * ReviewFormDialog Component
 *
 * Dialog component for submitting book reviews. Uses React Query mutation.
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Star } from "lucide-react";
import { useCreateReview } from "@/hooks/useMutations";

interface ReviewFormDialogProps {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

export default function ReviewFormDialog({
  bookId,
  isOpen,
  onClose,
  onReviewSubmitted,
}: ReviewFormDialogProps) {
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
          // Add delay before closing to let user see the toast
          setTimeout(() => {
            onReviewSubmitted();
            onClose();
            // Reset form
            setRating(5);
            setComment("");
          }, 1500);
        },
      }
    );
  };

  const handleClose = () => {
    if (!createReviewMutation.isPending) {
      onClose();
      // Reset form when closing
      setRating(5);
      setComment("");
    }
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="border-gray-600 bg-gray-800/95 sm:max-w-md [&>button]:text-white [&>button]:hover:text-white">
        <DialogHeader>
          <DialogTitle className="text-base text-light-100 sm:text-lg">
            Write a Review
          </DialogTitle>
          <DialogDescription className="text-xs text-light-200/70 sm:text-sm">
            Share your thoughts and rate this book
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs font-medium text-light-200 sm:text-sm">
              Rating
            </label>
            <StarRating />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs font-medium text-light-200 sm:text-sm">
              Your Review
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this book..."
              className="w-full resize-none rounded-md border border-gray-600 bg-gray-700/50 px-2.5 py-1.5 text-xs text-light-100 placeholder:text-light-200/50 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400 sm:px-3 sm:py-2 sm:text-sm"
              rows={4}
              required
            />
            <p className="text-[10px] text-light-200/70 sm:text-xs">
              {comment.length}/500 characters
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createReviewMutation.isPending}
              className="w-full border-gray-500 bg-gray-600 text-xs text-white hover:bg-gray-500 hover:text-white sm:w-auto sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createReviewMutation.isPending || !comment.trim()}
              className="w-full bg-green-600 text-xs text-white hover:bg-green-700 sm:w-auto sm:text-sm"
            >
              {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
