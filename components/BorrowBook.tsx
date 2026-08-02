"use client";

/**
 * BorrowBook Component
 *
 * Button component for borrowing books. Uses React Query mutation.
 * Integrates with useBorrowBook mutation for proper cache invalidation.
 *
 * Features:
 * - Uses useBorrowBook mutation
 * - Automatic cache invalidation on success
 * - Toast notifications via mutation callbacks
 * - Navigation to profile page on success
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BookMarked } from "lucide-react";
import { useBorrowBook } from "@/hooks/useMutations";

interface Props {
  userId: string;
  bookId: string;
  borrowingEligibility: {
    isEligible: boolean;
    message: string;
  };
}

const BorrowBook = ({
  userId,
  bookId,
  borrowingEligibility: { isEligible },
}: Props) => {
  const router = useRouter();

  // Use React Query mutation for borrowing book
  const borrowBookMutation = useBorrowBook();

  const handleBorrowBook = () => {
    if (!isEligible) {
      return; // Validation handled by mutation
    }

    // Use mutation to borrow book
    borrowBookMutation.mutate(
      {
        userId,
        bookId,
      },
      {
        onSuccess: () => {
          // CRITICAL: Navigate after mutation completes
          // The optimistic update is already in the cache, and now we have the real data
          // React Query will use the cached data instead of refetching
          router.push("/my-profile");
        },
        onError: (error) => {
          console.error("[BorrowBook] Mutation error:", error);
          // Show error to user
          alert(`Failed to borrow book: ${error.message}`);
        },
      },
    );
  };

  return (
    <span className="cta-shine-wrap mt-3 w-full sm:mt-4 sm:w-fit">
      <Button
        className="cta-shine-button hover:bg-primary/90 min-h-12 w-full bg-primary text-dark-100 sm:min-h-14"
        onClick={handleBorrowBook}
        disabled={borrowBookMutation.isPending || !isEligible}
      >
        <BookMarked className="size-4 text-dark-100 sm:size-5" />
        <span className="font-bebas-neue text-base text-dark-100 sm:text-xl">
          {borrowBookMutation.isPending ? "Borrowing ..." : "Borrow Book"}
        </span>
      </Button>
    </span>
  );
};
export default BorrowBook;
