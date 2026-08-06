"use client";

// Parent: REQ-0027, REQ-0030 — reservation densify with create upsert + baselines
import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reserveUnavailableBook } from "@/lib/actions/circulation";
import { queryKeys } from "@/lib/query/keys";
import { commitMutationCache } from "@/lib/query/mutationGateway";
import {
  densifyReservationCreate,
  snapshotReservationBaselines,
} from "@/lib/utils/patchReservationCaches";
import { showToast } from "@/lib/toast";

export default function ReserveBookButton({ bookId }: { bookId: string }) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [isReserved, setIsReserved] = useState(false);
  const userId = (session?.user as SessionUser | undefined)?.id;

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
          const bookTitle =
            queryClient.getQueryData<{ title?: string }>(
              queryKeys.books.detail(bookId),
            )?.title ?? "Reserved book";
          const baselines = snapshotReservationBaselines(queryClient);
          await commitMutationCache(queryClient, "reservation.lifecycle", {
            snapshot: () => baselines,
            densify: (snap) => {
              densifyReservationCreate(
                queryClient,
                {
                  id: result.data.id,
                  status: "WAITING",
                  bookId: result.data.bookId ?? bookId,
                  userId,
                  bookTitle,
                  queuePosition: null,
                  readyExpiresAt: null,
                },
                snap ?? undefined,
              );
            },
          });
          showToast.success("Reserved", "You joined the waitlist for this book.");
        });
      }}
    >
      <BookmarkPlus className="size-4" />
      {isPending ? "Reserving…" : isReserved ? "Waitlisted" : "Join Waitlist"}
    </Button>
  );
}
