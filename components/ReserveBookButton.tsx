"use client";

// Parent: REQ-0027, REQ-0030
import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reserveUnavailableBook } from "@/lib/actions/circulation";
import { invalidateMutation } from "@/lib/utils/queryInvalidation";
import { showToast } from "@/lib/toast";

export default function ReserveBookButton({ bookId }: { bookId: string }) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [isReserved, setIsReserved] = useState(false);

  return (
    <Button
      className="mt-3 min-h-12 w-full sm:mt-4 sm:min-h-14 sm:w-fit"
      disabled={isPending || isReserved}
      onClick={() => {
        startTransition(async () => {
          const result = await reserveUnavailableBook(bookId);
          if (!result.success) {
            showToast.error("Reservation Failed", result.error);
            return;
          }
          setIsReserved(true);
          await invalidateMutation(queryClient, "reservation.lifecycle");
          showToast.success("Reserved", "You joined the waitlist for this book.");
        });
      }}
    >
      <BookmarkPlus className="size-4" />
      {isPending ? "Reserving…" : isReserved ? "Waitlisted" : "Join Waitlist"}
    </Button>
  );
}
