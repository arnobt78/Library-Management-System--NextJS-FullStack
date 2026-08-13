/**
 * SSR loader for signed-in user reservations — same shape as /api/reservations/me
 * and densify key circulation.userReservations(userId).
 * Shared by home hero, book detail Waitlisted CTA, and my-profile Holds.
 * Parent: REQ-0027, REQ-0030
 */

import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";
import type { UserReservationItem } from "@/lib/services/reservations";

/** Load ≤25 reservations for SSR seed (EXPIRED clock + queue position + book meta). */
export async function loadUserReservationsSsr(
  userId: string,
): Promise<UserReservationItem[]> {
  const reservationResult = await db.execute(sql`
    SELECT r.id, r.book_id, r.created_at,
      CASE WHEN r.status = 'READY' AND r.ready_expires_at <= CURRENT_TIMESTAMP
        THEN 'EXPIRED' ELSE r.status END AS status,
      r.ready_expires_at, b.title AS book_title,
      b.author AS book_author,
      b.cover_url AS cover_url,
      b.cover_color AS cover_color,
      b.genre AS genre,
      b.rating AS book_rating,
      b.isbn AS isbn,
      CASE WHEN r.status = 'WAITING' THEN (
        SELECT COUNT(*)::int FROM reservations ahead
        WHERE ahead.book_id = r.book_id AND ahead.status = 'WAITING'
          AND (ahead.created_at, ahead.id) <= (r.created_at, r.id)
      ) ELSE NULL END AS queue_position
    FROM reservations r JOIN books b ON b.id = r.book_id
    WHERE r.user_id = ${userId}
    ORDER BY r.created_at DESC LIMIT 25
  `);

  return reservationResult.rows.map((row) => ({
    id: String(row.id),
    bookId: String(row.book_id),
    status: String(row.status) as UserReservationItem["status"],
    bookTitle: String(row.book_title),
    queuePosition:
      row.queue_position == null ? null : Number(row.queue_position),
    readyExpiresAt:
      row.ready_expires_at == null ? null : String(row.ready_expires_at),
    bookAuthor: row.book_author == null ? null : String(row.book_author),
    coverUrl: row.cover_url == null ? null : String(row.cover_url),
    coverColor: row.cover_color == null ? null : String(row.cover_color),
    genre: row.genre == null ? null : String(row.genre),
    bookRating: row.book_rating == null ? null : Number(row.book_rating),
    createdAt: row.created_at == null ? null : String(row.created_at),
    isbn: row.isbn == null ? null : String(row.isbn),
  }));
}
