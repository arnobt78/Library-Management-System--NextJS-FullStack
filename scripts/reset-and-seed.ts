/**
 * reset-and-seed.ts
 *
 * Atomically wipes all transactional data and re-seeds the database with:
 *   - 17 canonical books (from dummybooks.json) with full schema coverage
 *   - 2 test accounts (Test User + Test Admin) with scrypt-hashed passwords
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
 * Requires DATABASE_URL in .env
 *
 * Parent: REQ-0033
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

  // reservation_events → reservations (FK chain)
  await db.execute(sql`DELETE FROM reservation_events`);
  console.log("  ✓ reservation_events cleared");

  // circulation_commands references users
  await db.execute(sql`DELETE FROM circulation_commands`);
  console.log("  ✓ circulation_commands cleared");

  // operation_telemetry has no FK references
  await db.execute(sql`DELETE FROM operation_telemetry`);
  console.log("  ✓ operation_telemetry cleared");

  // reservations references users, books, borrow_records
  await db.execute(sql`DELETE FROM reservations`);
  console.log("  ✓ reservations cleared");

  // borrow_records references users and books
  await db.execute(sql`DELETE FROM borrow_records`);
  console.log("  ✓ borrow_records cleared");

  // book_reviews references books and users
  await db.execute(sql`DELETE FROM book_reviews`);
  console.log("  ✓ book_reviews cleared");

  // admin_requests references users
  await db.execute(sql`DELETE FROM admin_requests`);
  console.log("  ✓ admin_requests cleared");

  // signup decision ledger references users
  await db.execute(sql`DELETE FROM user_status_decisions`);
  console.log("  ✓ user_status_decisions cleared");

  // CR-0003 / REQ-0034–0037 surfaces (must wipe before users)
  await db.execute(sql`DELETE FROM support_ticket_replies`);
  console.log("  ✓ support_ticket_replies cleared");
  await db.execute(sql`DELETE FROM support_tickets`);
  console.log("  ✓ support_tickets cleared");
  await db.execute(sql`DELETE FROM notifications`);
  console.log("  ✓ notifications cleared");
  await db.execute(sql`DELETE FROM activity_logs`);
  console.log("  ✓ activity_logs cleared");

  // books (all FK children already deleted)
  await db.execute(sql`DELETE FROM books`);
  console.log("  ✓ books cleared");

  // users (all FK children already deleted)
  await db.execute(sql`DELETE FROM users`);
  console.log("  ✓ users cleared");

  // system_config is preserved — fine amounts, borrow duration etc. are admin-managed settings.

  console.log("\nSeeding books...");

  // ── 2. Seed books ────────────────────────────────────────────────────────────
  // availableCopies is set to totalCopies for a clean slate (no borrow records).
  // isFeatured is true only for Algorithms (the curated homepage hero).

  for (const book of dummybooks) {
    await db.execute(sql`
      INSERT INTO books (
        id, title, author, genre, rating,
        cover_url, cover_color, description,
        total_copies, available_copies,
        video_url, summary,
        isbn, publication_year, publisher, language, page_count, edition,
        is_active, is_featured,
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
        NOW(),
        NOW()
      )
    `);
    const featured = book.id === FEATURED_BOOK_ID ? " [featured]" : "";
    console.log(`  ✓ ${book.title}${featured}`);
  }

  console.log("\nSeeding users...");

  // ── 3. Seed test accounts (APPROVED + durable status_reviewed_* to demo admin)
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

  // Stamp signup attribution: both demo accounts reviewed by Test Admin (self for admin)
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

  // Seed signup decision ledger (Recent decisions UI reads this, not users alone)
  await db.execute(sql`
    INSERT INTO user_status_decisions (user_id, decision, decided_by, decided_at)
    SELECT
      u.id,
      'APPROVED',
      u.status_reviewed_by,
      COALESCE(u.status_reviewed_at, u.created_at, NOW())
    FROM users AS u
    WHERE u.email IN ('test@user.com', 'test@admin.com')
      AND u.status = 'APPROVED'
  `);
  console.log("  ✓ user_status_decisions seeded for demo accounts");

  console.log("\nreset-and-seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("reset-and-seed failed:", err);
  process.exit(1);
});
