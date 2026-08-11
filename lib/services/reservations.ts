/**
 * Client service for user reservation list (profile panel densify key).
 */

import { ApiError } from "@/lib/services/apiError";

export type UserReservationItem = {
  id: string;
  status: "WAITING" | "READY" | "FULFILLED" | "CANCELLED" | "EXPIRED";
  bookTitle: string;
  bookId: string;
  queuePosition: number | null;
  readyExpiresAt: string | null;
  /** Optional — User 360 SSR / densify may omit */
  bookAuthor?: string | null;
  coverUrl?: string | null;
  coverColor?: string | null;
  genre?: string | null;
  bookRating?: number | null;
  createdAt?: string | Date | null;
};

/** Fetch signed-in user's active reservations (matches densify user list key). */
export async function getMyReservations(): Promise<UserReservationItem[]> {
  const response = await fetch("/api/reservations/me", { method: "GET" });
  if (!response.ok) {
    throw new ApiError("Failed to load reservations", response.status);
  }
  return response.json();
}
