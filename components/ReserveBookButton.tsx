"use client";

/**
 * Join Waitlist CTA — same primary chrome as BorrowBook (cta-shine + Bebas).
 * Parent: REQ-0027, REQ-0030 — reservation densify with create upsert + baselines
 */

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { BookmarkPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reserveUnavailableBook } from "@/lib/actions/circulation";
import { queryKeys } from "@/lib/query/keys";
import { commitMutationCache } from "@/lib/query/mutationGateway";
import {
  densifyReservationCreate,
  snapshotReservationBaselines,
} from "@/lib/utils/patchReservationCaches";
import { densifyActivityLog } from "@/lib/utils/patchActivityCaches";
import { showToast } from "@/lib/toast";

export default function ReserveBookButton({ bookId }: { bookId: string }) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [isReserved, setIsReserved] = useState(false);
  const userId = (session?.user as SessionUser | undefined)?.id;

  return (
    <span className="cta-shine-wrap mt-3 w-full sm:mt-4 sm:w-fit">
      <Button
        className="cta-shine-button hover:bg-primary/90 min-h-12 w-full bg-primary text-dark-100 sm:min-h-14"
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
                densifyActivityLog(queryClient, {
                  actorId: userId ?? null,
                  actorName:
                    (session?.user as SessionUser | undefined)?.name ?? null,
                  actorEmail:
                    (session?.user as SessionUser | undefined)?.email ?? null,
                  action: "CREATE",
                  entityType: "reservation",
                  entityId: result.data.id,
                  details: {
                    status: "WAITING",
                    bookId: result.data.bookId ?? bookId,
                    userId: userId ?? null,
                    title: bookTitle,
                  },
                });
              },
            });
            showToast.success(
              "Reserved",
              "You joined the waitlist for this book.",
            );
          });
        }}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin text-dark-100 sm:size-5" />
        ) : (
          <BookmarkPlus className="size-4 text-dark-100 sm:size-5" />
        )}
        <span className="font-bebas-neue text-base text-dark-100 sm:text-xl">
          {isPending ? "Reserving…" : isReserved ? "Waitlisted" : "Join Waitlist"}
        </span>
      </Button>
    </span>
  );
}
