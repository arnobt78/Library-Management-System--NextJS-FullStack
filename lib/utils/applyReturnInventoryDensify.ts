/**
 * Shared settle densify after returnBorrowRecord — absolute copies + optional FIFO offer.
 * Single call site for useReturnBook (no optimistic Available +1).
 * Parent: Book panel DNA closeout
 */

import type { QueryClient } from "@tanstack/react-query";
import { setBookAvailableCopiesAbsolute } from "@/lib/utils/patchBorrowCaches";
import { densifyReservationStatus } from "@/lib/utils/patchReservationCaches";

export function applyReturnInventoryDensify(
  queryClient: QueryClient,
  args: {
    bookId: string | null | undefined;
    availableCopies?: number | null;
    offeredReservationId?: string | null;
  },
): void {
  const { bookId, availableCopies, offeredReservationId } = args;
  if (!bookId) return;

  if (
    typeof availableCopies === "number" &&
    Number.isFinite(availableCopies)
  ) {
    setBookAvailableCopiesAbsolute(queryClient, bookId, availableCopies);
  }

  if (offeredReservationId) {
    densifyReservationStatus(queryClient, {
      id: offeredReservationId,
      bookId,
      status: "READY",
      fromStatus: "WAITING",
    });
  }
}
