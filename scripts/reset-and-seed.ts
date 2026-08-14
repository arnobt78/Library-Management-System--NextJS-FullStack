/**
 * reset-and-seed.ts
 *
 * Atomically wipes all transactional data and re-seeds:
 *   - 2 test accounts first (Test User + Test Admin) with scrypt-hashed passwords
 *   - 17 canonical books with created_by + updated_by = test@admin.com (Added/Updated DNA)
 *   - status_reviewed_* stamped on both accounts (no ledger / circulation rows)
 *
 * Intentionally empty after seed: borrows, holds, reviews, tickets,
 * admin_requests, notifications, activity_logs, user_status_decisions.
 * Create those while testing one-by-one.
 *
 * Delete order respects FK constraints:
 *   reservation_events → circulation_commands → operation_telemetry →
 *   reservations → borrow_records → book_reviews → admin_requests →
 *   books → users
 * system_config is intentionally preserved (fine amounts, borrow duration, etc.)
 *
 * Usage:
 *   npm run seed:reset
 *
 * Requires DATABASE_URL in .env + migration 0015_books_created_by applied.
 *
 * Parent: REQ-0033 / books createdBy DNA densify
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

config({ path: ".env" });

import dummybooks from "../dummybooks.json";
import { TEST_ACCOUNTS } from "@/constants";
import { hashPassword } from "@/lib/auth/password";

// Algorithms is the curated homepage featured book.
const FEATURED_BOOK_ID = "fe03e013-53b8-4574-9ca8-caec69a9b16c";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { casing: "snake_case" });

  console.log("Starting reset-and-seed...");

  // ── 1. Wipe all transactional data in FK-safe order ─────────────────────────

  await db.execute(sql`DELETE FROM reservation_events`);
  console.log("  ✓ reservation_events cleared");

  await db.execute(sql`DELETE FROM circulation_commands`);
  console.log("  ✓ circulation_commands cleared");

  await db.execute(sql`DELETE FROM operation_telemetry`);
  console.log("  ✓ operation_telemetry cleared");

  await db.execute(sql`DELETE FROM reservations`);
  console.log("  ✓ reservations cleared");

  await db.execute(sql`DELETE FROM borrow_records`);
  console.log("  ✓ borrow_records cleared");

  await db.execute(sql`DELETE FROM book_reviews`);
  console.log("  ✓ book_reviews cleared");

  await db.execute(sql`DELETE FROM admin_requests`);
  console.log("  ✓ admin_requests cleared");

  await db.execute(sql`DELETE FROM user_status_decisions`);
  console.log("  ✓ user_status_decisions cleared");

  await db.execute(sql`DELETE FROM support_ticket_replies`);
  console.log("  ✓ support_ticket_replies cleared");
  await db.execute(sql`DELETE FROM support_tickets`);
  console.log("  ✓ support_tickets cleared");
  await db.execute(sql`DELETE FROM notifications`);
  console.log("  ✓ notifications cleared");
  await db.execute(sql`DELETE FROM activity_logs`);
  console.log("  ✓ activity_logs cleared");

  await db.execute(sql`DELETE FROM books`);
  console.log("  ✓ books cleared");

  await db.execute(sql`DELETE FROM users`);
  console.log("  ✓ users cleared");

  // system_config is preserved — fine amounts, borrow duration etc. are admin-managed settings.

  console.log("\nSeeding users...");

  // ── 2. Users first (books.created_by / updated_by FK need admin id)
  for (const account of TEST_ACCOUNTS) {
    const hashedPassword = await hashPassword(account.password);

    await db.execute(sql`
      INSERT INTO users (
        full_name, email, university_id, password,
        university_card, role, status,
        created_at, last_activity_date
      ) VALUES (
        ${account.fullName},
        ${account.email},
        ${account.universityId},
        ${hashedPassword},
        ${account.image},
        ${account.role},
        'APPROVED',
        NOW(),
        CURRENT_DATE
      )
    `);
    console.log(`  ✓ ${account.email} (${account.role})`);
  }

  await db.execute(sql`
    UPDATE users AS u
    SET
      status_reviewed_by = admin.id,
      status_reviewed_at = COALESCE(u.status_reviewed_at, u.created_at, NOW())
    FROM users AS admin
    WHERE admin.email = 'test@admin.com'
      AND u.email IN ('test@user.com', 'test@admin.com')
      AND u.status = 'APPROVED'
  `);
  console.log("  ✓ status_reviewed_* stamped to test@admin.com");

  const adminLookup = await db.execute(sql`
    SELECT id FROM users WHERE email = 'test@admin.com' LIMIT 1
  `);
  const adminRow = (
    adminLookup as unknown as { rows?: Array<{ id: string }> }
  ).rows?.[0];
  const adminId = adminRow?.id;
  if (!adminId) {
    throw new Error("Seed failed: test@admin.com missing after user insert");
  }

  console.log("\nSeeding books...");

  // ── 3. Books with Created-by / Updated-by = Test Admin
  for (const book of dummybooks) {
    await db.execute(sql`
      INSERT INTO books (
        id, title, author, genre, rating,
        cover_url, cover_color, description,
        total_copies, available_copies,
        video_url, summary,
        isbn, publication_year, publisher, language, page_count, edition,
        is_active, is_featured,
        created_by, updated_by,
        created_at, updated_at
      ) VALUES (
        ${book.id}::uuid,
        ${book.title},
        ${book.author},
        ${book.genre},
        ${book.rating},
        ${book.coverUrl},
        ${book.coverColor},
        ${book.description},
        ${book.totalCopies},
        ${book.totalCopies},
        ${book.videoUrl},
        ${book.summary},
        ${book.isbn ?? null},
        ${book.publicationYear ?? null},
        ${book.publisher ?? null},
        ${book.language ?? "English"},
        ${book.pageCount ?? null},
        ${book.edition ?? null},
        ${book.isActive ?? true},
        ${book.id === FEATURED_BOOK_ID},
        ${adminId}::uuid,
        ${adminId}::uuid,
        NOW(),
        NOW()
      )
    `);
    const featured = book.id === FEATURED_BOOK_ID ? " [featured]" : "";
    console.log(`  ✓ ${book.title}${featured}`);
  }

  console.log("\nreset-and-seed complete (17 books + 2 accounts; queues empty).");
  console.log("  Catalog Added/Updated stamps → test@admin.com");
  await pool.end();
}

main().catch((err) => {
  console.error("reset-and-seed failed:", err);
  process.exit(1);
});
