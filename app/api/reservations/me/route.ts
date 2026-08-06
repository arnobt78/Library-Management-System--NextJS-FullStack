/**
 * GET /api/reservations/me — signed-in user's reservation list for RQ densify.
 */

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { requireAuthenticatedActor } from "@/lib/auth/authorization";

export async function GET() {
  try {
    const actor = await requireAuthenticatedActor();
    const result = await db.execute(sql`
      SELECT r.id, r.book_id,
        CASE WHEN r.status = 'READY' AND r.ready_expires_at <= CURRENT_TIMESTAMP
          THEN 'EXPIRED' ELSE r.status END AS status,
        r.ready_expires_at, b.title AS book_title,
        CASE WHEN r.status = 'WAITING' THEN (
          SELECT COUNT(*)::int FROM reservations ahead
          WHERE ahead.book_id = r.book_id AND ahead.status = 'WAITING'
            AND (ahead.created_at, ahead.id) <= (r.created_at, r.id)
        ) ELSE NULL END AS queue_position
      FROM reservations r JOIN books b ON b.id = r.book_id
      WHERE r.user_id = ${actor.id}
      ORDER BY r.created_at DESC LIMIT 25
    `);

    const rows = result.rows.map((row) => ({
      id: String(row.id),
      bookId: String(row.book_id),
      status: String(row.status),
      bookTitle: String(row.book_title),
      queuePosition:
        row.queue_position == null ? null : Number(row.queue_position),
      readyExpiresAt:
        row.ready_expires_at == null ? null : String(row.ready_expires_at),
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/reservations/me:", error);
    return NextResponse.json(
      { error: "Failed to load reservations" },
      { status: 401 },
    );
  }
}
