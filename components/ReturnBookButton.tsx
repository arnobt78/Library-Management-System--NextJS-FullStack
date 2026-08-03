"use client";

/**
 * ReturnBookButton — return via useReturnBook with spinner pending state.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";
import { useReturnBook } from "@/hooks/useMutations";

interface Props {
  recordId: string;
  bookTitle: string;
  dueDate: Date | null;
}

const ReturnBookButton = ({ recordId, bookTitle, dueDate }: Props) => {
  const returnBookMutation = useReturnBook();
  const isPending = returnBookMutation.isPending;

  const handleReturnBook = () => {
    returnBookMutation.mutate(
      {
        recordId,
        bookTitle,
      },
      {
        onError: (error) => {
          console.error("[ReturnBookButton] Mutation error:", error);
        },
      },
    );
  };

  const today = new Date();
  const isOverdue = dueDate && today > new Date(dueDate);
  const daysOverdue = isOverdue
    ? Math.floor(
        (today.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <Button
      className={`hover:bg-primary/90 mt-3 min-h-12 w-full bg-primary text-dark-100 sm:mt-4 sm:min-h-14 sm:w-fit ${isOverdue ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}
      onClick={handleReturnBook}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin text-dark-100 sm:size-5" />
      ) : (
        <RotateCcw className="size-4 text-dark-100 sm:size-5" />
      )}
      <p className="font-bebas-neue text-base text-dark-100 sm:text-xl">
        {isPending
          ? "Returning…"
          : isOverdue
            ? `Return Book (${daysOverdue} days overdue)`
            : "Return Book"}
      </p>
    </Button>
  );
};

export default ReturnBookButton;
