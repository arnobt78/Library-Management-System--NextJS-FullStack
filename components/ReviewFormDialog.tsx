"use client";

/**
 * Shared create/edit review dialog.
 * Create → useCreateReview; edit → useUpdateReview.
 * Closes immediately on success (no artificial delay) so the submit spinner
 * never idles while the dialog is still open.
 * Parent should remount via `key` when switching edit targets so initials seed cleanly.
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
import { Loader2, Pencil, Send, Star, X } from "lucide-react";
import { useCreateReview, useUpdateReview } from "@/hooks/useMutations";

type ReviewFormMode = "create" | "edit";

interface ReviewFormDialogProps {
  mode?: ReviewFormMode;
  bookId: string;
  bookTitle?: string;
  /** Required when mode="edit" */
  reviewId?: string;
  initialRating?: number;
  initialComment?: string;
  isOpen: boolean;
  onClose: () => void;
  /** Create success (ReviewButton) */
  onReviewSubmitted?: () => void;
  /** Edit success — parent applies local patch */
  onReviewSaved?: (payload: {
    reviewId: string;
    rating: number;
    comment: string;
  }) => void;
}

export default function ReviewFormDialog({
  mode = "create",
  bookId,
  bookTitle,
  reviewId,
  initialRating = 5,
  initialComment = "",
  isOpen,
  onClose,
  onReviewSubmitted,
  onReviewSaved,
}: ReviewFormDialogProps) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const createReviewMutation = useCreateReview();
  const updateReviewMutation = useUpdateReview();
  const isPending =
    mode === "edit"
      ? updateReviewMutation.isPending
      : createReviewMutation.isPending;

  const resetAndClose = () => {
    setRating(mode === "edit" ? initialRating : 5);
    setComment(mode === "edit" ? initialComment : "");
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isPending) {
      resetAndClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const nextComment = comment.trim();

    if (mode === "edit") {
      if (!reviewId) return;
      updateReviewMutation.mutate(
        {
          reviewId,
          bookId,
          bookTitle,
          rating,
          comment: nextComment,
        },
        {
          onSuccess: () => {
            onReviewSaved?.({
              reviewId,
              rating,
              comment: nextComment,
            });
            resetAndClose();
          },
        },
      );
      return;
    }

    createReviewMutation.mutate(
      {
        bookId,
        rating,
        comment: nextComment,
        bookTitle,
      },
      {
        onSuccess: () => {
          onReviewSubmitted?.();
          resetAndClose();
        },
      },
    );
  };

  const title = mode === "edit" ? "Edit Your Review" : "Write a Review";
  const description = bookTitle
    ? mode === "edit"
      ? `Update your review for “${bookTitle}”`
      : `Share your thoughts and rate “${bookTitle}”`
    : mode === "edit"
      ? "Update your thoughts and rating for this book"
      : "Share your thoughts and rate this book";
  const submitLabel =
    mode === "edit"
      ? isPending
        ? "Updating…"
        : "Update Review"
      : isPending
        ? "Submitting…"
        : "Submit Review";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="border-gray-600 bg-gray-800/95 sm:max-w-md [&>button]:text-white [&>button]:hover:text-white">
        <DialogHeader>
          <DialogTitle className="text-base text-light-100 sm:text-lg">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-light-200/70 sm:text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs font-medium text-light-200 sm:text-sm">
              Rating
            </label>
            <div className="flex items-center gap-0.5 sm:space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={isPending}
                  onClick={() => setRating(star)}
                  className="transition-colors hover:scale-110 disabled:opacity-60"
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
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs font-medium text-light-200 sm:text-sm">
              Your Review
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this book..."
              disabled={isPending}
              className="w-full resize-none rounded-md border border-gray-600 bg-gray-700/50 px-2.5 py-1.5 text-xs text-light-100 placeholder:text-light-200/50 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400 disabled:opacity-60 sm:px-3 sm:py-2 sm:text-sm"
              rows={4}
              required
              maxLength={500}
            />
            <p className="text-[10px] text-light-200/70 sm:text-xs">
              {comment.length}/500 characters
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
              className="w-full border-gray-500 bg-gray-600 text-xs text-white hover:bg-gray-500 hover:text-white sm:w-auto sm:text-sm"
            >
              <X className="size-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !comment.trim()}
              className="w-full gap-1.5 bg-green-600 text-xs text-white hover:bg-green-700 sm:w-auto sm:text-sm"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "edit" ? (
                <Pencil className="size-4" />
              ) : (
                <Send className="size-4" />
              )}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
