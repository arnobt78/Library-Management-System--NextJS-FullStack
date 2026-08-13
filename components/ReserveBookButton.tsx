"use client";

/**
 * Join Waitlist CTA — same primary chrome as BorrowBook (cta-shine + Bebas).
 * Waitlisted state from useUserReservations densify (survives remount/soft-nav).
 * After success: densify full Holds row (queue/reserved/ISBN) then navigate to Holds
 * (parity with BorrowBook → pending-requests).
 * Parent: REQ-0027, REQ-0030
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { useUserReservations } from "@/hooks/useQueries";
import { profileTabHref } from "@/lib/profile/profileTabs";
import type { UserReservationItem } from "@/lib/services/reservations";
import { showToast } from "@/lib/toast";

type BookDetailCache = {
  title?: string;
  author?: string;
  coverUrl?: string;
  coverColor?: string;
  genre?: string;
  rating?: number;
  isbn?: string | null;
};

export default function ReserveBookButton({
  bookId,
  userId,
  initialReservations = [],
}: {
  bookId: string;
  userId?: string;
  /** SSR seed — Waiting/Ready for this user so Waitlisted paints on first load. */
  initialReservations?: UserReservationItem[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [ssrTimestamp] = useState(() => Date.now());
  const effectiveUserId =
    userId ?? (session?.user as SessionUser | undefined)?.id;

  const { data: reservations = [] } = useUserReservations(
    effectiveUserId,
    initialReservations,
    initialReservations.length > 0 ? ssrTimestamp : undefined,
  );

  // WAITING or READY for this book → already on the waitlist (claimable hold).
  const alreadyWaitlisted = reservations.some(
    (row) =>
      row.bookId === bookId &&
      (row.status === "WAITING" || row.status === "READY"),
  );

  return (
    <span className="cta-shine-wrap mt-3 w-full sm:mt-4 sm:w-fit">
      <Button
        className="cta-shine-button hover:bg-primary/90 min-h-12 w-full bg-primary text-dark-100 sm:min-h-14"
        disabled={isPending || alreadyWaitlisted}
        onClick={() => {
          startTransition(async () => {
            const result = await reserveUnavailableBook(bookId);
            if (!result.success) {
              showToast.error("Reservation Failed", result.error);
              return;
            }
            const bookCached =
              queryClient.getQueryData<BookDetailCache>(
                queryKeys.books.detail(bookId),
              ) ?? undefined;
            const bookTitle = bookCached?.title ?? "Reserved book";
            const baselines = snapshotReservationBaselines(queryClient);
            await commitMutationCache(queryClient, "reservation.lifecycle", {
              snapshot: () => baselines,
              densify: (snap) => {
                // Full Holds row — never re-patch queuePosition:null after invalidate
                densifyReservationCreate(
                  queryClient,
                  {
                    id: result.data.id,
                    status: "WAITING",
                    bookId: result.data.bookId ?? bookId,
                    userId: effectiveUserId,
                    bookTitle,
                    queuePosition: result.data.queuePosition,
                    readyExpiresAt: null,
                    createdAt: result.data.createdAt,
                    bookAuthor: bookCached?.author ?? null,
                    coverUrl: bookCached?.coverUrl ?? null,
                    coverColor: bookCached?.coverColor ?? null,
                    genre: bookCached?.genre ?? null,
                    bookRating: bookCached?.rating ?? null,
                    isbn: bookCached?.isbn ?? null,
                  },
                  snap ?? undefined,
                );
                densifyActivityLog(queryClient, {
                  actorId: effectiveUserId ?? null,
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
                    userId: effectiveUserId ?? null,
                    title: bookTitle,
                    queuePosition: result.data.queuePosition,
                  },
                });
              },
            });
            showToast.success(
              "Reserved",
              "You joined the waitlist for this book.",
            );
            // Borrow parity: land on Active Holds with densified queue/meta
            router.push(profileTabHref("holds"));
          });
        }}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin text-dark-100 sm:size-5" />
        ) : (
          <BookmarkPlus className="size-4 text-dark-100 sm:size-5" />
        )}
        <span className="font-bebas-neue text-base text-dark-100 sm:text-xl">
          {isPending
            ? "Reserving…"
            : alreadyWaitlisted
              ? "Waitlisted"
              : "Join Waitlist"}
        </span>
      </Button>
    </span>
  );
}
