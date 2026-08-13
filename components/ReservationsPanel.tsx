"use client";

/**
 * Profile Holds / reservations panel — densify claim/cancel via gateway.
 * Embedded Holds tab cards mirror Pending Requests `profile-borrow-row` DNA.
 * Parent: REQ-0027, REQ-0030
 */

import { useEffect, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  BookOpenText,
  Calendar,
  Clock,
  Hourglass,
  Library,
  ListOrdered,
  Loader2,
  Star,
  X,
} from "lucide-react";
import BookCover from "@/components/BookCover";
import PrefetchLink from "@/components/PrefetchLink";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  borrowReservedBook,
  cancelBookReservation,
} from "@/lib/actions/circulation";
import { useUserReservations } from "@/hooks/useQueries";
import { commitMutationCache } from "@/lib/query/mutationGateway";
import {
  densifyReservationStatus,
  snapshotReservationBaselines,
} from "@/lib/utils/patchReservationCaches";
import {
  patchBorrowCachesOnCreate,
  snapshotBorrowCacheBaselines,
} from "@/lib/utils/patchBorrowCaches";
import { densifyActivityLog } from "@/lib/utils/patchActivityCaches";
import type { UserReservationItem } from "@/lib/services/reservations";
import { showToast } from "@/lib/toast";
import { filterActiveHolds } from "@/lib/profile/activeHolds";
import {
  formatBorrowDate,
  formatBorrowDateTime,
} from "@/lib/profile/formatBorrowDates";
import { withRippleClick } from "@/lib/ui/ripple";
import { GLASS_ALERT } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";

export type ReservationSummary = UserReservationItem;

export default function ReservationsPanel({
  initialReservations,
  userId,
  /** Holds tab: always show panel (empty copy when none). */
  embedded = false,
  /**
   * Shared wall clock from parent (My Profile KPI). When provided (including
   * null), panel skips its own ticker so Active Holds count and list lockstep.
   * Omit the prop for standalone panel ownership.
   */
  clockMs,
}: {
  initialReservations: ReservationSummary[];
  /** Signed-in user — densify user reservation list after claim/cancel. */
  userId?: string;
  embedded?: boolean;
  clockMs?: number | null;
}) {
  const [ssrTimestamp] = useState(() => Date.now());
  const { data: items = [] } = useUserReservations(
    userId,
    initialReservations,
    initialReservations.length > 0 ? ssrTimestamp : undefined,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  /** Snapshot for Cancel Hold dialog — outside list card so densify unmount cannot close it. */
  const [cancelHoldTarget, setCancelHoldTarget] =
    useState<UserReservationItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [internalClock, setInternalClock] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const clockOwnedByParent = clockMs !== undefined;
  const clock = clockOwnedByParent ? (clockMs ?? null) : internalClock;

  useEffect(() => {
    if (clockOwnedByParent) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const advance = () => {
      const now = Date.now();
      setInternalClock(now);
      const nextBoundary = items
        .filter((item) => item.status === "READY" && item.readyExpiresAt)
        .map((item) => new Date(item.readyExpiresAt!).getTime())
        .filter((timestamp) => timestamp > now)
        .sort((left, right) => left - right)[0];
      if (nextBoundary)
        timer = setTimeout(
          advance,
          Math.min(nextBoundary - now + 1, 2_147_483_647),
        );
    };
    advance();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [items, clockOwnedByParent]);

  const run = (id: string, action: "claim" | "cancel", bookId: string) => {
    setPendingId(id);
    startTransition(async () => {
      try {
        const result =
          action === "claim"
            ? await borrowReservedBook(id)
            : await cancelBookReservation(id);
        if (!result.success)
          return showToast.error("Reservation Update Failed", result.error);
        const nextStatus = action === "claim" ? "FULFILLED" : "CANCELLED";
        const fromStatus =
          items.find((item) => item.id === id)?.status ?? null;
        const resolvedBookId =
          (result.data && "bookId" in result.data
            ? result.data.bookId
            : undefined) ?? bookId;
        const reservationBaselines = snapshotReservationBaselines(queryClient);
        const borrowBaselines =
          action === "claim" && resolvedBookId
            ? snapshotBorrowCacheBaselines(queryClient, [resolvedBookId])
            : undefined;
        const claimPayload =
          action === "claim" &&
          result.data &&
          typeof result.data === "object" &&
          "borrowId" in result.data &&
          typeof (result.data as { borrowId?: unknown }).borrowId === "string"
            ? (result.data as {
                borrowId: string;
                bookId: string;
                dueDate: string;
              })
            : null;
        await commitMutationCache(queryClient, "reservation.lifecycle", {
          snapshot: () => reservationBaselines,
          densify: (snap) => {
            densifyReservationStatus(
              queryClient,
              {
                id,
                status: nextStatus,
                bookId: resolvedBookId,
                userId,
                fromStatus,
              },
              snap ?? undefined,
            );
            // Claim creates BORROWED — densify lists + decrement available copies.
            if (claimPayload && userId) {
              patchBorrowCachesOnCreate(
                queryClient,
                {
                  userId,
                  tempId: claimPayload.borrowId,
                  serverRecord: {
                    id: claimPayload.borrowId,
                    userId,
                    bookId: resolvedBookId,
                    status: "BORROWED",
                    dueDate: claimPayload.dueDate,
                    borrowDate: new Date(),
                  },
                  inventory: { availableDelta: -1, activeDelta: 1 },
                  inventoryBaselines: borrowBaselines?.inventory,
                },
                borrowBaselines,
              );
            }
            densifyActivityLog(queryClient, {
              actorId: userId ?? null,
              action: "UPDATE",
              entityType: "reservation",
              entityId: id,
              details: {
                status: nextStatus,
                ...(resolvedBookId ? { bookId: resolvedBookId } : {}),
                ...(userId ? { userId } : {}),
              },
            });
          },
        });
        showToast.success(
          "Reservation Updated",
          action === "claim"
            ? "The reserved book is now borrowed."
            : "The reservation was cancelled.",
        );
      } finally {
        setPendingId(null);
        if (action === "cancel") setCancelHoldTarget(null);
      }
    });
  };

  const isCancelHoldBusy =
    Boolean(cancelHoldTarget) &&
    isPending &&
    pendingId === cancelHoldTarget?.id;

  const handleConfirmCancelHold = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cancelHoldTarget || isPending) return;
    run(cancelHoldTarget.id, "cancel", cancelHoldTarget.bookId);
  };

  const active = filterActiveHolds(items, clock);

  // Embedded (Holds tab): always render chrome + empty copy.
  // Standalone (legacy above-tabs): hide when nothing active.
  if (active.length === 0 && !embedded && cancelHoldTarget == null) return null;

  const statusBadge = (status: UserReservationItem["status"]) => {
    if (status === "READY") {
      return (
        <Badge variant="glassBorrowed">
          <BookOpen className="size-3" />
          Ready to Claim
        </Badge>
      );
    }
    return (
      <Badge variant="glassPending">
        <Hourglass className="size-3" />
        Waiting
      </Badge>
    );
  };

  const cancelHoldDialog = (
    <AlertDialog
      open={cancelHoldTarget != null}
      onOpenChange={(open) => {
        if (isCancelHoldBusy) return;
        if (!open) setCancelHoldTarget(null);
      }}
    >
      <AlertDialogContent className={GLASS_ALERT.content}>
        <AlertDialogHeader>
          <AlertDialogTitle className={GLASS_ALERT.title}>
            Cancel hold?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className={`space-y-2 ${GLASS_ALERT.description}`}>
              <p>
                Leave the waitlist for this book. You can join again later if
                copies are still unavailable.
              </p>
              {cancelHoldTarget ? (
                <div className={`flex gap-3 ${GLASS_ALERT.preview}`}>
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded sm:h-28 sm:w-20">
                    <BookCover
                      variant="small"
                      coverColor={cancelHoldTarget.coverColor ?? "#1e293b"}
                      coverImage={cancelHoldTarget.coverUrl ?? ""}
                      className="size-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-light-100">
                      {cancelHoldTarget.bookTitle}
                    </p>
                    {cancelHoldTarget.bookAuthor ? (
                      <p className="mt-1 text-xs text-light-200">
                        by {cancelHoldTarget.bookAuthor}
                      </p>
                    ) : null}
                    {(cancelHoldTarget.genre ||
                      cancelHoldTarget.bookRating != null) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {cancelHoldTarget.genre ? (
                          <Badge
                            variant="glassGenre"
                            className="px-1.5 py-0.5 sm:px-2"
                          >
                            <Library className="size-3" />
                            {cancelHoldTarget.genre}
                          </Badge>
                        ) : null}
                        {cancelHoldTarget.bookRating != null ? (
                          <div className="flex items-center gap-1">
                            <Star className="size-3 fill-current text-yellow-400 sm:size-4" />
                            <span className="text-xs text-yellow-400 sm:text-sm">
                              {cancelHoldTarget.bookRating}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={GLASS_ALERT.footer}>
          <AlertDialogCancel
            disabled={isCancelHoldBusy}
            className={GLASS_ALERT.cancel}
          >
            Keep hold
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmCancelHold}
            disabled={isCancelHoldBusy}
            className={GLASS_ALERT.destructive}
          >
            {isCancelHoldBusy ? (
              <Loader2 className="size-3.5 animate-spin sm:size-4" />
            ) : (
              <X className="size-3.5 sm:size-4" />
            )}
            {isCancelHoldBusy ? "Cancelling…" : "Cancel Hold"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const body =
    active.length === 0 ? (
      <div
        role="status"
        className="profile-borrow-row p-4 text-center sm:p-6"
      >
        <p className="text-sm text-light-200 sm:text-base">
          No active holds right now. Reserve a book from the catalog when
          copies are unavailable.
        </p>
      </div>
    ) : (
      <div className="space-y-2 sm:space-y-4">
        {active.map((item) => {
          const isReady = item.status === "READY";
          const rowBusy = isPending && pendingId === item.id;
          const reservedAt = formatBorrowDateTime(item.createdAt ?? null);
          const reservedDay = formatBorrowDate(item.createdAt ?? null);
          const readyUntil = formatBorrowDateTime(item.readyExpiresAt);
          const readyUntilDay = formatBorrowDate(item.readyExpiresAt);
          const rowAccent = isReady
            ? "profile-borrow-row--borrowed"
            : "profile-borrow-row--pending";

          return (
            <div
              key={item.id}
              role="article"
              className={cn("profile-borrow-row", rowAccent)}
            >
              <div className="p-2.5 text-light-100 sm:p-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative w-full shrink-0 sm:w-48">
                    <BookCover
                      variant="regular"
                      coverColor={item.coverColor ?? "#1e293b"}
                      coverImage={item.coverUrl ?? ""}
                      className="h-64 w-full sm:h-full"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-medium sm:text-xl">
                          <PrefetchLink
                            href={`/books/${item.bookId}`}
                            className="text-light-100 transition-colors hover:text-light-100/70"
                          >
                            {item.bookTitle}
                          </PrefetchLink>
                        </h3>
                        {item.bookAuthor ? (
                          <p className="text-xs sm:text-sm">
                            <span className="text-light-100/70">by </span>
                            <span className="text-light-200 sm:text-base">
                              {item.bookAuthor}
                            </span>
                          </p>
                        ) : null}
                      </div>
                      <div className="w-fit shrink-0 sm:ml-2">
                        {statusBadge(item.status)}
                      </div>
                    </div>

                    {(item.genre || item.bookRating != null) && (
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {item.genre ? (
                          <Badge
                            variant="glassGenre"
                            className="px-1.5 py-0.5 sm:px-2"
                          >
                            <Library className="size-3" />
                            {item.genre}
                          </Badge>
                        ) : null}
                        {item.bookRating != null ? (
                          <div className="flex items-center gap-1">
                            <Star className="size-3 fill-current text-yellow-400 sm:size-4" />
                            <span className="text-xs text-yellow-400 sm:text-sm">
                              {item.bookRating}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Meta: queue / reserved / ready — Pending DNA icon row */}
                    <div className="mb-2 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-4 sm:text-sm">
                      {item.status === "WAITING" ? (
                        <div className="flex items-center gap-1">
                          <ListOrdered className="size-3 text-fuchsia-400 sm:size-4" />
                          <span className="font-medium text-light-200">
                            Queue:
                          </span>
                          <span className="text-light-100">
                            {item.queuePosition ?? "—"}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3 text-blue-400 sm:size-4" />
                        <span className="font-medium text-light-200">
                          Reserved:
                        </span>
                        <span className="text-light-100">
                          {reservedDay ?? "N/A"}
                        </span>
                      </div>
                      {isReady ? (
                        <div className="flex items-center gap-1">
                          <Clock className="size-3 text-purple-400 sm:size-4" />
                          <span className="font-medium text-light-200">
                            Ready until:
                          </span>
                          <span className="text-light-100">
                            {readyUntilDay ?? "—"}
                          </span>
                        </div>
                      ) : null}
                      {item.isbn ? (
                        <div className="flex items-center gap-1">
                          <BookOpen className="size-3 text-green-400 sm:size-4" />
                          <span className="font-medium text-light-200">
                            ISBN:
                          </span>
                          <span className="font-mono text-light-100">
                            {item.isbn.slice(-4)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="mb-2">
                      {item.status === "WAITING" ? (
                        <div className="flex flex-wrap items-center gap-1.5 rounded bg-yellow-500/10 px-2 py-1 sm:gap-2">
                          <Hourglass className="size-3 shrink-0 text-yellow-400 sm:size-4" />
                          <span className="text-xs text-yellow-400 sm:text-sm">
                            In queue
                            {item.queuePosition != null
                              ? ` · position ${item.queuePosition}`
                              : ""}
                            {reservedAt ? ` · reserved ${reservedAt}` : ""}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5 rounded bg-blue-500/10 px-2 py-1 sm:gap-2">
                          <Clock className="size-3 shrink-0 text-blue-400 sm:size-4" />
                          <span className="text-xs text-blue-400 sm:text-sm">
                            Ready to claim
                            {readyUntil ? ` · expires ${readyUntil}` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isReady ? (
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={withRippleClick(
                            () => run(item.id, "claim", item.bookId),
                            rowBusy,
                          )}
                          className="profile-action-btn profile-action-btn--details"
                        >
                          {rowBusy && pendingId === item.id ? (
                            <Loader2 className="size-3 animate-spin sm:size-4" />
                          ) : (
                            <BookOpen className="size-3 sm:size-4" />
                          )}
                          <span>
                            {rowBusy && pendingId === item.id
                              ? "Working…"
                              : "Borrow now"}
                          </span>
                        </button>
                      ) : null}

                      <PrefetchLink
                        href={`/books/${item.bookId}`}
                        className="profile-action-btn profile-action-btn--details"
                      >
                        <BookOpenText className="size-3 sm:size-4" />
                        <span>View Details</span>
                      </PrefetchLink>

                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={withRippleClick(
                          () => setCancelHoldTarget(item),
                          rowBusy,
                        )}
                        className="profile-action-btn profile-action-btn--cancel-request"
                      >
                        {rowBusy && pendingId === item.id ? (
                          <Loader2 className="size-3 animate-spin sm:size-4" />
                        ) : (
                          <X className="size-3 sm:size-4" />
                        )}
                        <span>
                          {rowBusy && pendingId === item.id
                            ? "Cancelling…"
                            : "Cancel Hold"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );

  if (embedded) {
    return (
      <>
        <div className="space-y-2 sm:space-y-4">{body}</div>
        {cancelHoldDialog}
      </>
    );
  }

  return (
    <>
      <section className="mb-6 rounded-2xl border border-gray-600 bg-dark-300/40 p-2 sm:p-4">
        <h2 className="text-lg font-medium text-light-100">Active holds</h2>
        <div className="mt-3">{body}</div>
      </section>
      {cancelHoldDialog}
    </>
  );
}
