"use client";

/**
 * BorrowBook — request a loan via useBorrowBook.
 * Pending: spinner + “Borrowing…”; success navigates to pending-requests tab.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BookMarked, Loader2 } from "lucide-react";
import { useBorrowBook } from "@/hooks/useMutations";
import { profileTabHref } from "@/lib/profile/profileTabs";

interface Props {
  userId: string;
  bookId: string;
  /** Used for dynamic success/error toasts */
  bookTitle?: string;
  borrowingEligibility: {
    isEligible: boolean;
    message: string;
  };
}

const BorrowBook = ({
  userId,
  bookId,
  bookTitle,
  borrowingEligibility: { isEligible },
}: Props) => {
  const router = useRouter();
  const borrowBookMutation = useBorrowBook();
  const isPending = borrowBookMutation.isPending;

  const handleBorrowBook = () => {
    if (!isEligible) return;

    borrowBookMutation.mutate(
      {
        userId,
        bookId,
        bookTitle,
      },
      {
        onSuccess: () => {
          // Borrow creates PENDING — land on pending-requests tab
          router.push(profileTabHref("pending-requests"));
        },
        onError: (error) => {
          console.error("[BorrowBook] Mutation error:", error);
        },
      },
    );
  };

  return (
    <span className="cta-shine-wrap mt-3 w-full sm:mt-4 sm:w-fit">
      <Button
        className="cta-shine-button hover:bg-primary/90 min-h-12 w-full bg-primary text-dark-100 sm:min-h-14"
        onClick={handleBorrowBook}
        disabled={isPending || !isEligible}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin text-dark-100 sm:size-5" />
        ) : (
          <BookMarked className="size-4 text-dark-100 sm:size-5" />
        )}
        <span className="font-bebas-neue text-base text-dark-100 sm:text-xl">
          {isPending ? "Borrowing…" : "Borrow Book"}
        </span>
      </Button>
    </span>
  );
};
export default BorrowBook;
