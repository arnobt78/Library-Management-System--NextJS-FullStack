"use client";

// Parent: REQ-0027, REQ-0030
import { useEffect, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  borrowReservedBook,
  cancelBookReservation,
} from "@/lib/actions/circulation";
import { invalidateMutation } from "@/lib/utils/queryInvalidation";
import { showToast } from "@/lib/toast";

export interface ReservationSummary {
  id: string;
  status: "WAITING" | "READY" | "FULFILLED" | "CANCELLED" | "EXPIRED";
  bookTitle: string;
  queuePosition: number | null;
  readyExpiresAt: string | null;
}

export default function ReservationsPanel({
  initialReservations,
}: {
  initialReservations: ReservationSummary[];
}) {
  const [items, setItems] = useState(initialReservations);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [clock, setClock] = useState<number | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const advance = () => {
      const now = Date.now();
      setClock(now);
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
  }, [items]);

  const run = (id: string, action: "claim" | "cancel") => {
    setPendingId(id);
    startTransition(async () => {
      try {
        const result =
          action === "claim"
            ? await borrowReservedBook(id)
            : await cancelBookReservation(id);
        if (!result.success)
          return showToast.error("Reservation Update Failed", result.error);
        setItems((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: action === "claim" ? "FULFILLED" : "CANCELLED",
                }
              : item,
          ),
        );
        await invalidateMutation(queryClient, "reservation.lifecycle");
        showToast.success(
          "Reservation Updated",
          action === "claim"
            ? "The reserved book is now borrowed."
            : "The reservation was cancelled.",
        );
      } finally {
        setPendingId(null);
      }
    });
  };

  const active = items.filter(
    (item) =>
      item.status === "WAITING" ||
      (item.status === "READY" &&
        (!clock ||
          !item.readyExpiresAt ||
          new Date(item.readyExpiresAt).getTime() > clock)),
  );
  if (active.length === 0) return null;
  return (
    <section className="mb-6 rounded-2xl border border-gray-600 bg-dark-300/40 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-light-100">Reservations</h2>
      <div className="mt-3 space-y-3">
        {active.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-dark-300 p-3"
          >
            <div>
              <p className="font-medium text-light-100">{item.bookTitle}</p>
              <p className="text-xs text-light-200/70">
                {item.status === "WAITING"
                  ? `Queue position ${item.queuePosition ?? "—"}`
                  : `Ready until ${item.readyExpiresAt ? new Date(item.readyExpiresAt).toLocaleString() : "—"}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{item.status}</Badge>
              {item.status === "READY" ? (
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => run(item.id, "claim")}
                >
                  {pendingId === item.id ? "Working…" : "Borrow now"}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => run(item.id, "cancel")}
              >
                Cancel
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
