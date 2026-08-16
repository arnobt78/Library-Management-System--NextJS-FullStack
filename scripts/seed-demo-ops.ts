/**
 * seed-demo-ops.ts
 *
 * Clears circulation/ops overlays and inserts a mixed fixture for Insights +
 * User 360 Verify. Keeps users + books (run `npm run seed:reset` first if missing).
 *
 * Switch back to empty queues: `npm run seed:reset`
 *
 * Usage: npm run seed:demo
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

config({ path: ".env" });

const BOOK = {
  css: "9084986f-456c-449b-ae6e-59ef1f26b129",
  html: "350c3bc8-a5cc-45a3-ba16-97b93ed056b0",
  system: "b514f922-a715-45ec-846e-e51d40e15aa2",
  distilled: "b4ed06bf-02b2-42c4-8886-b3847af02cca",
  assembly: "dc73abc1-8699-4e0a-91b0-a67e80292b9c",
  software: "17a58b62-0258-45a5-8b8b-9a21a6d6630c",
  db: "91445e57-01a8-4e1e-bb18-cf04b3a0b7d1",
  os: "c3f2ff59-a3c2-47d2-a793-93457a9dccf7",
} as const;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function dateDaysAgo(days: number): string {
  return isoDaysAgo(days).slice(0, 10);
}

function dateDaysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { casing: "snake_case" });

  console.log("Starting seed-demo-ops...");

  const usersLookup = await db.execute(sql`
    SELECT id, email FROM users
    WHERE email IN ('test@user.com', 'test@admin.com')
  `);
  const userRows = (
    usersLookup as unknown as {
      rows?: Array<{ id: string; email: string }>;
    }
  ).rows ?? [];
  const userId = userRows.find((r) => r.email === "test@user.com")?.id;
  const adminId = userRows.find((r) => r.email === "test@admin.com")?.id;
  if (!userId || !adminId) {
    throw new Error(
      "Missing test@user.com / test@admin.com — run npm run seed:reset first",
    );
  }

  const booksLookup = await db.execute(sql`
    SELECT id FROM books WHERE id = ${BOOK.css}::uuid LIMIT 1
  `);
  const bookOk = (
    booksLookup as unknown as { rows?: Array<{ id: string }> }
  ).rows?.[0];
  if (!bookOk) {
    throw new Error("Catalog books missing — run npm run seed:reset first");
  }

  // ── Clear overlays only (keep users + books) ─────────────────────────────
  await db.execute(sql`DELETE FROM reservation_events`);
  await db.execute(sql`DELETE FROM circulation_commands`);
  await db.execute(sql`DELETE FROM operation_telemetry`);
  await db.execute(sql`DELETE FROM reservations`);
  await db.execute(sql`DELETE FROM borrow_records`);
  await db.execute(sql`DELETE FROM book_reviews`);
  await db.execute(sql`DELETE FROM admin_requests`);
  await db.execute(sql`DELETE FROM user_status_decisions`);
  await db.execute(sql`DELETE FROM support_ticket_replies`);
  await db.execute(sql`DELETE FROM support_tickets`);
  await db.execute(sql`DELETE FROM notifications`);
  await db.execute(sql`DELETE FROM activity_logs`);
  console.log("  ✓ overlays cleared");

  // Reset inventory to full copies before demo borrows.
  await db.execute(sql`
    UPDATE books SET available_copies = total_copies
  `);

  // ── Borrow mix ───────────────────────────────────────────────────────────
  // PENDING
  await db.execute(sql`
    INSERT INTO borrow_records (
      user_id, book_id, status, borrow_date, due_date,
      borrowed_by, fine_amount, created_at, updated_at, updated_by
    ) VALUES (
      ${userId}::uuid, ${BOOK.css}::uuid, 'PENDING',
      ${isoDaysAgo(1)}::timestamptz, NULL,
      'test@user.com', '0.00',
      ${isoDaysAgo(1)}::timestamptz, ${isoDaysAgo(1)}::timestamptz, NULL
    )
  `);

  // BORROWED on-time (due in 5 days)
  await db.execute(sql`
    INSERT INTO borrow_records (
      user_id, book_id, status, borrow_date, due_date,
      borrowed_by, fine_amount, created_at, updated_at, updated_by
    ) VALUES (
      ${userId}::uuid, ${BOOK.html}::uuid, 'BORROWED',
      ${isoDaysAgo(2)}::timestamptz, ${dateDaysFromNow(5)}::date,
      'test@user.com', '0.00',
      ${isoDaysAgo(2)}::timestamptz, ${isoDaysAgo(2)}::timestamptz, 'test@admin.com'
    )
  `);
  await db.execute(sql`
    UPDATE books SET available_copies = GREATEST(available_copies - 1, 0)
    WHERE id = ${BOOK.html}::uuid
  `);

  // Overdue 1–6 days (3 days)
  await db.execute(sql`
    INSERT INTO borrow_records (
      user_id, book_id, status, borrow_date, due_date,
      borrowed_by, fine_amount, created_at, updated_at, updated_by
    ) VALUES (
      ${userId}::uuid, ${BOOK.system}::uuid, 'BORROWED',
      ${isoDaysAgo(10)}::timestamptz, ${dateDaysAgo(3)}::date,
      'test@user.com', '1.50',
      ${isoDaysAgo(10)}::timestamptz, ${isoDaysAgo(3)}::timestamptz, 'test@admin.com'
    )
  `);
  await db.execute(sql`
    UPDATE books SET available_copies = GREATEST(available_copies - 1, 0)
    WHERE id = ${BOOK.system}::uuid
  `);

  // Overdue 7–29 days (14 days)
  await db.execute(sql`
    INSERT INTO borrow_records (
      user_id, book_id, status, borrow_date, due_date,
      borrowed_by, fine_amount, created_at, updated_at, updated_by
    ) VALUES (
      ${userId}::uuid, ${BOOK.distilled}::uuid, 'BORROWED',
      ${isoDaysAgo(21)}::timestamptz, ${dateDaysAgo(14)}::date,
      'test@user.com', '7.00',
      ${isoDaysAgo(21)}::timestamptz, ${isoDaysAgo(14)}::timestamptz, 'test@admin.com'
    )
  `);
  await db.execute(sql`
    UPDATE books SET available_copies = GREATEST(available_copies - 1, 0)
    WHERE id = ${BOOK.distilled}::uuid
  `);

  // Overdue 30+ days (45 days)
  await db.execute(sql`
    INSERT INTO borrow_records (
      user_id, book_id, status, borrow_date, due_date,
      borrowed_by, fine_amount, created_at, updated_at, updated_by
    ) VALUES (
      ${userId}::uuid, ${BOOK.assembly}::uuid, 'BORROWED',
      ${isoDaysAgo(60)}::timestamptz, ${dateDaysAgo(45)}::date,
      'test@user.com', '22.50',
      ${isoDaysAgo(60)}::timestamptz, ${isoDaysAgo(45)}::timestamptz, 'test@admin.com'
    )
  `);
  await db.execute(sql`
    UPDATE books SET available_copies = GREATEST(available_copies - 1, 0)
    WHERE id = ${BOOK.assembly}::uuid
  `);

  // RETURNED on time
  await db.execute(sql`
    INSERT INTO borrow_records (
      user_id, book_id, status, borrow_date, due_date, return_date,
      borrowed_by, returned_by, fine_amount, created_at, updated_at, updated_by
    ) VALUES (
      ${userId}::uuid, ${BOOK.software}::uuid, 'RETURNED',
      ${isoDaysAgo(20)}::timestamptz, ${dateDaysAgo(13)}::date, ${dateDaysAgo(14)}::date,
      'test@user.com', 'test@user.com', '0.00',
      ${isoDaysAgo(20)}::timestamptz, ${isoDaysAgo(14)}::timestamptz, 'test@user.com'
    )
  `);

  // CANCELLED (soft)
  await db.execute(sql`
    INSERT INTO borrow_records (
      user_id, book_id, status, borrow_date, due_date,
      borrowed_by, fine_amount, notes, created_at, updated_at, updated_by
    ) VALUES (
      ${userId}::uuid, ${BOOK.db}::uuid, 'CANCELLED',
      ${isoDaysAgo(5)}::timestamptz, NULL,
      'test@user.com', '0.00', 'Rejected by admin',
      ${isoDaysAgo(5)}::timestamptz, ${isoDaysAgo(4)}::timestamptz, 'test@admin.com'
    )
  `);
  console.log("  ✓ borrow mix (PENDING / BORROWED / overdue / RETURNED / CANCELLED)");

  // ── WAITING hold ─────────────────────────────────────────────────────────
  await db.execute(sql`
    INSERT INTO reservations (user_id, book_id, status, created_at, updated_at)
    VALUES (
      ${userId}::uuid, ${BOOK.os}::uuid, 'WAITING',
      ${isoDaysAgo(1)}::timestamptz, ${isoDaysAgo(1)}::timestamptz
    )
  `);
  console.log("  ✓ WAITING reservation");

  // ── Reviews ──────────────────────────────────────────────────────────────
  await db.execute(sql`
    INSERT INTO book_reviews (
      book_id, user_id, rating, comment, status,
      created_at, updated_at
    ) VALUES (
      ${BOOK.css}::uuid, ${userId}::uuid, 5,
      'Excellent deep dive into modern CSS — demo PENDING review.',
      'PENDING',
      ${isoDaysAgo(2)}::timestamptz, ${isoDaysAgo(2)}::timestamptz
    )
  `);
  await db.execute(sql`
    INSERT INTO book_reviews (
      book_id, user_id, rating, comment, status,
      reviewed_by, reviewed_at, created_at, updated_at
    ) VALUES (
      ${BOOK.html}::uuid, ${userId}::uuid, 4,
      'Clear examples for beginners — demo APPROVED review.',
      'APPROVED',
      ${adminId}::uuid, ${isoDaysAgo(1)}::timestamptz,
      ${isoDaysAgo(3)}::timestamptz, ${isoDaysAgo(1)}::timestamptz
    )
  `);
  console.log("  ✓ reviews (PENDING + APPROVED)");

  // ── Tickets (OPEN + IN_PROGRESS with real update stamp) ──────────────────
  await db.execute(sql`
    INSERT INTO support_tickets (
      subject, description, status, priority, user_id,
      created_at, updated_at
    ) VALUES (
      'Cannot renew overdue loan',
      'Demo OPEN ticket — Updated should show dash until edit.',
      'OPEN', 'HIGH', ${userId}::uuid,
      ${isoDaysAgo(2)}::timestamptz, ${isoDaysAgo(2)}::timestamptz
    )
  `);
  await db.execute(sql`
    INSERT INTO support_tickets (
      subject, description, status, priority, user_id,
      assigned_to_id, updated_by, related_book_id,
      created_at, updated_at
    ) VALUES (
      'Damaged cover on Assembly Language',
      'Demo IN_PROGRESS ticket claimed by admin.',
      'IN_PROGRESS', 'MEDIUM', ${userId}::uuid,
      ${adminId}::uuid, ${adminId}::uuid, ${BOOK.assembly}::uuid,
      ${isoDaysAgo(4)}::timestamptz, ${isoDaysAgo(1)}::timestamptz
    )
  `);
  console.log("  ✓ tickets (OPEN + IN_PROGRESS)");

  // ── Activity log samples ─────────────────────────────────────────────────
  await db.execute(sql`
    INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, details, created_at)
    VALUES
      (
        ${adminId}::uuid, 'UPDATE', 'borrow', NULL,
        ${JSON.stringify({ note: "Demo approve borrow" })}::jsonb,
        ${isoDaysAgo(2)}::timestamptz
      ),
      (
        ${userId}::uuid, 'CREATE', 'ticket', NULL,
        ${JSON.stringify({ note: "Demo open ticket" })}::jsonb,
        ${isoDaysAgo(2)}::timestamptz
      ),
      (
        ${adminId}::uuid, 'UPDATE', 'review', NULL,
        ${JSON.stringify({ note: "Demo approve review" })}::jsonb,
        ${isoDaysAgo(1)}::timestamptz
      )
  `);
  console.log("  ✓ activity_logs");

  console.log("\nseed-demo-ops complete.");
  console.log("  Verify: /admin/business-insights + /admin/users (User 360)");
  console.log("  Empty queues again: npm run seed:reset");
  await pool.end();
}

main().catch((err) => {
  console.error("seed-demo-ops failed:", err);
  process.exit(1);
});
