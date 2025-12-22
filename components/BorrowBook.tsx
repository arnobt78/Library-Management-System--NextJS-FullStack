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
import { BookOpen } from "lucide-react";
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
          // Navigate immediately - React Query placeholderData will show previous data
          // during refetch, preventing flicker. Our memoization ensures components
          // don't re-render unnecessarily.
          router.push("/my-profile");
        },
        onError: (error) => {
          console.error("[BorrowBook] Mutation error:", error);
        },
      }
    );
  };

  return (
    <Button
      className="hover:bg-primary/90 mt-4 min-h-14 w-fit bg-primary text-dark-100 max-md:w-full"
      onClick={handleBorrowBook}
      disabled={borrowBookMutation.isPending || !isEligible}
    >
      <BookOpen className="size-5 text-dark-100" />
      <p className="font-bebas-neue text-xl text-dark-100">
        {borrowBookMutation.isPending ? "Borrowing ..." : "Borrow Book"}
      </p>
    </Button>
  );
};
export default BorrowBook;
