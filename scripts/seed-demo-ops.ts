/**
 * seed-demo-ops.ts
 *
 * Clears circulation/ops overlays and inserts a rich mixed fixture for Insights,
 * User 360, fines, holds, tickets, reviews, notifications, and activity.
 * Keeps users + books — run `npm run seed:reset` first if missing.
 *
 * Usage:
 *   npm run seed:reset && npm run seed:demo
 *
 * Empty queues again: npm run seed:reset
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

config({ path: ".env" });

/** Canonical book ids from dummybooks.json (stable across seed:reset). */
const BOOK = {
  css: "9084986f-456c-449b-ae6e-59ef1f26b129",
  html: "350c3bc8-a5cc-45a3-ba16-97b93ed056b0",
  system: "b514f922-a715-45ec-846e-e51d40e15aa2",
  distilled: "b4ed06bf-02b2-42c4-8886-b3847af02cca",
  assembly: "dc73abc1-8699-4e0a-91b0-a67e80292b9c",
  software: "17a58b62-0258-45a5-8b8b-9a21a6d6630c",
  db: "91445e57-01a8-4e1e-bb18-cf04b3a0b7d1",
  os: "c3f2ff59-a3c2-47d2-a793-93457a9dccf7",
  algorithms: "fe03e013-53b8-4574-9ca8-caec69a9b16c",
  cleanCoder: "585df184-991b-4edf-9902-f8531c3a81d9",
  leanStartup: "cea639ce-ee90-4ef9-9fef-c9562a247e99",
  atomicHabits: "68f7c183-b995-4ba3-a644-30110ebb932e",
  react: "b6b9cc5d-95fd-488e-b1df-2a805678b430",
  jsGoodParts: "8f45a8ad-e0e1-437e-8987-5bcbaca24bd9",
  eloquentJs: "d125678e-80d7-4ba8-97a6-cc6ee4b980ef",
  fullstackReact: "383a8140-08b8-4c7c-97a7-e1bc68dc1488",
  cracking: "cc625b42-6852-44af-b3a3-e668fa967b8e",
} as const;

/** Fixed demo row ids — activity_logs + reservation_events reference these. */
const DEMO = {
  borrowPending: "b0000001-0000-4000-8000-000000000001",
  borrowOnTime: "b0000002-0000-4000-8000-000000000002",
  borrowOverdue3: "b0000003-0000-4000-8000-000000000003",
  borrowOverdue14: "b0000004-0000-4000-8000-000000000004",
  borrowOverdue45: "b0000005-0000-4000-8000-000000000005",
  borrowReturned: "b0000006-0000-4000-8000-000000000006",
  borrowReturnedFine: "b0000007-0000-4000-8000-000000000007",
  borrowCancelled: "b0000008-0000-4000-8000-000000000008",
  borrowSelfCancel: "b0000009-0000-4000-8000-000000000009",
  borrowAdminLoan: "b000000a-0000-4000-8000-00000000000a",
  borrowWaived: "b000000b-0000-4000-8000-00000000000b",
  borrowRenewed: "b000000c-0000-4000-8000-00000000000c",
  holdWaiting: "c0000001-0000-4000-8000-000000000001",
  holdReady: "c0000002-0000-4000-8000-000000000002",
  holdExpired: "c0000003-0000-4000-8000-000000000003",
  holdFulfilled: "c0000004-0000-4000-8000-000000000004",
  borrowHist1: "b000000d-0000-4000-8000-00000000000d",
  borrowHist2: "b000000e-0000-4000-8000-00000000000e",
  borrowHist3: "b000000f-0000-4000-8000-00000000000f",
  reviewPending: "d0000001-0000-4000-8000-000000000001",
  reviewApproved: "d0000002-0000-4000-8000-000000000002",
  reviewRejected: "d0000003-0000-4000-8000-000000000003",
  reviewAdmin: "d0000004-0000-4000-8000-000000000004",
  ticketOpen: "e0000001-0000-4000-8000-000000000001",
  ticketProgress: "e0000002-0000-4000-8000-000000000002",
  ticketResolved: "e0000003-0000-4000-8000-000000000003",
  ticketClosed: "e0000004-0000-4000-8000-000000000004",
  adminReqPending: "f0000001-0000-4000-8000-000000000001",
} as const;

function isoDaysAgo(days: number, hour = 10): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 30, 0, 0);
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

function isoDaysFromNow(days: number, hour = 10): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 30, 0, 0);
  return d.toISOString();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { casing: "snake_case" });

  console.log("Starting seed-demo-ops...");

  const usersLookup = await db.execute(sql`
    SELECT id, email, full_name FROM users
    WHERE email IN ('test@user.com', 'test@admin.com')
  `);
  const userRows = (
    usersLookup as unknown as {
      rows?: Array<{ id: string; email: string; full_name: string }>;
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
  if (!(booksLookup as unknown as { rows?: unknown[] }).rows?.[0]) {
    throw new Error("Catalog books missing — run npm run seed:reset first");
  }

  // ── Clear overlays (keep users, books, system_config) ────────────────────
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
  await db.execute(sql`DELETE FROM fine_rate_history`);
  console.log("  ✓ overlays cleared");

  await db.execute(sql`UPDATE books SET available_copies = total_copies`);
  console.log("  ✓ inventory reset to full copies");

  // ── Fine config + rate history (pro-rata demo) ─────────────────────────────
  await db.execute(sql`
    INSERT INTO system_config (key, value, description, updated_by, updated_at)
    VALUES ('daily_fine_amount', '1.00', 'Daily overdue fine (USD)', 'test@admin.com', NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `);
  await db.execute(sql`
    INSERT INTO fine_rate_history (rate, effective_from, created_by, created_at)
    VALUES
      ('0.50', ${dateDaysAgo(120)}::date, 'test@admin.com', ${isoDaysAgo(120)}::timestamptz),
      ('1.00', ${dateDaysAgo(30)}::date, 'test@admin.com', ${isoDaysAgo(30)}::timestamptz)
  `);
  console.log("  ✓ system_config + fine_rate_history");

  // ── Signup decision ledger (user approved by admin) ──────────────────────
  await db.execute(sql`
    INSERT INTO user_status_decisions (user_id, decision, decided_by, decided_at)
    VALUES (${userId}::uuid, 'APPROVED', ${adminId}::uuid, ${isoDaysAgo(90, 9)}::timestamptz)
  `);
  console.log("  ✓ user_status_decisions");

  // ── Borrow mix (both accounts, all statuses, fine_status variants) ───────
  const borrows: Array<{ bookId: string; dec?: number }> = [];

  const insertBorrow = async (
    id: string,
    borrowerId: string,
    bookId: string,
    fields: {
      status: string;
      borrowDaysAgo: number;
      dueDaysAgo?: number | null;
      dueDaysFromNow?: number | null;
      returnDaysAgo?: number | null;
      borrowedBy: string;
      returnedBy?: string | null;
      fineAmount?: string;
      fineStatus?: string;
      renewalCount?: number;
      notes?: string | null;
      updatedBy?: string | null;
      lastReminderDaysAgo?: number | null;
    },
  ) => {
    const dueDate =
      fields.dueDaysFromNow != null
        ? dateDaysFromNow(fields.dueDaysFromNow)
        : fields.dueDaysAgo != null
          ? dateDaysAgo(fields.dueDaysAgo)
          : null;
    const lastReminder =
      fields.lastReminderDaysAgo != null
        ? isoDaysAgo(fields.lastReminderDaysAgo)
        : null;

    await db.execute(sql`
      INSERT INTO borrow_records (
        id, user_id, book_id, status,
        borrow_date, due_date, return_date,
        borrowed_by, returned_by,
        fine_amount, fine_status, renewal_count, notes,
        last_reminder_sent,
        created_at, updated_at, updated_by
      ) VALUES (
        ${id}::uuid, ${borrowerId}::uuid, ${bookId}::uuid, ${fields.status},
        ${isoDaysAgo(fields.borrowDaysAgo)}::timestamptz,
        ${dueDate}::date,
        ${fields.returnDaysAgo != null ? dateDaysAgo(fields.returnDaysAgo) : null}::date,
        ${fields.borrowedBy}, ${fields.returnedBy ?? null},
        ${fields.fineAmount ?? "0.00"}, ${fields.fineStatus ?? "NONE"},
        ${fields.renewalCount ?? 0}, ${fields.notes ?? null},
        ${lastReminder}::timestamptz,
        ${isoDaysAgo(fields.borrowDaysAgo)}::timestamptz,
        ${isoDaysAgo(Math.max(0, fields.borrowDaysAgo - 1))}::timestamptz,
        ${fields.updatedBy ?? null}
      )
    `);

    if (fields.status === "BORROWED") {
      borrows.push({ bookId });
      await db.execute(sql`
        UPDATE books SET available_copies = GREATEST(available_copies - 1, 0)
        WHERE id = ${bookId}::uuid
      `);
    }
  };

  // User — queue + active loans
  await insertBorrow(DEMO.borrowPending, userId, BOOK.css, {
    status: "PENDING",
    borrowDaysAgo: 1,
    borrowedBy: "test@user.com",
  });

  await insertBorrow(DEMO.borrowOnTime, userId, BOOK.html, {
    status: "BORROWED",
    borrowDaysAgo: 3,
    dueDaysFromNow: 5,
    borrowedBy: "test@user.com",
    updatedBy: "test@admin.com",
    fineStatus: "NONE",
  });

  await insertBorrow(DEMO.borrowOverdue3, userId, BOOK.system, {
    status: "BORROWED",
    borrowDaysAgo: 12,
    dueDaysAgo: 3,
    borrowedBy: "test@user.com",
    updatedBy: "test@admin.com",
    fineAmount: "3.00",
    fineStatus: "ACCRUING",
    lastReminderDaysAgo: 1,
  });

  await insertBorrow(DEMO.borrowOverdue14, userId, BOOK.distilled, {
    status: "BORROWED",
    borrowDaysAgo: 28,
    dueDaysAgo: 14,
    borrowedBy: "test@user.com",
    updatedBy: "test@admin.com",
    fineAmount: "14.00",
    fineStatus: "STAMPED",
    renewalCount: 1,
    lastReminderDaysAgo: 2,
  });

  await insertBorrow(DEMO.borrowOverdue45, userId, BOOK.assembly, {
    status: "BORROWED",
    borrowDaysAgo: 75,
    dueDaysAgo: 45,
    borrowedBy: "test@user.com",
    updatedBy: "test@admin.com",
    fineAmount: "45.00",
    fineStatus: "ACCRUING",
    lastReminderDaysAgo: 3,
  });

  await insertBorrow(DEMO.borrowWaived, userId, BOOK.software, {
    status: "BORROWED",
    borrowDaysAgo: 20,
    dueDaysAgo: 8,
    borrowedBy: "test@user.com",
    updatedBy: "test@admin.com",
    fineAmount: "0.00",
    fineStatus: "WAIVED",
    notes: "Fine waived — demo fixture",
  });

  await insertBorrow(DEMO.borrowRenewed, userId, BOOK.db, {
    status: "BORROWED",
    borrowDaysAgo: 18,
    dueDaysFromNow: 2,
    borrowedBy: "test@user.com",
    updatedBy: "test@admin.com",
    renewalCount: 2,
    fineStatus: "NONE",
  });

  // History — returned / cancelled
  await insertBorrow(DEMO.borrowReturned, userId, BOOK.atomicHabits, {
    status: "RETURNED",
    borrowDaysAgo: 45,
    dueDaysAgo: 38,
    returnDaysAgo: 37,
    borrowedBy: "test@user.com",
    returnedBy: "test@user.com",
    fineStatus: "NONE",
  });

  await insertBorrow(DEMO.borrowReturnedFine, userId, BOOK.leanStartup, {
    status: "RETURNED",
    borrowDaysAgo: 60,
    dueDaysAgo: 50,
    returnDaysAgo: 45,
    borrowedBy: "test@user.com",
    returnedBy: "test@admin.com",
    fineAmount: "5.00",
    fineStatus: "PAID",
    updatedBy: "test@admin.com",
  });

  await insertBorrow(DEMO.borrowCancelled, userId, BOOK.cracking, {
    status: "CANCELLED",
    borrowDaysAgo: 8,
    borrowedBy: "test@user.com",
    notes: "Rejected by admin",
    updatedBy: "test@admin.com",
  });

  await insertBorrow(DEMO.borrowSelfCancel, userId, BOOK.eloquentJs, {
    status: "CANCELLED",
    borrowDaysAgo: 4,
    borrowedBy: "test@user.com",
    notes: "Cancelled by borrower",
    updatedBy: "test@user.com",
  });

  // Admin as borrower (User 360 / queue variety)
  await insertBorrow(DEMO.borrowAdminLoan, adminId, BOOK.cleanCoder, {
    status: "BORROWED",
    borrowDaysAgo: 6,
    dueDaysFromNow: 3,
    borrowedBy: "test@admin.com",
    updatedBy: "test@admin.com",
    fineStatus: "NONE",
  });

  // Spread historical returns for Insights monthly trend
  const histBooks = [BOOK.react, BOOK.jsGoodParts, BOOK.fullstackReact] as const;
  const histIds = [DEMO.borrowHist1, DEMO.borrowHist2, DEMO.borrowHist3] as const;
  for (let i = 0; i < histBooks.length; i += 1) {
    await insertBorrow(histIds[i], userId, histBooks[i], {
      status: "RETURNED",
      borrowDaysAgo: 20 + i * 15,
      dueDaysAgo: 13 + i * 15,
      returnDaysAgo: 12 + i * 15,
      borrowedBy: "test@user.com",
      returnedBy: "test@user.com",
    });
  }

  console.log(`  ✓ borrow_records (${borrows.length} active + history)`);

  // ── Reservations (WAITING / READY / EXPIRED / FULFILLED) ─────────────────
  await db.execute(sql`
    INSERT INTO reservations (
      id, user_id, book_id, status, created_at, updated_at
    ) VALUES (
      ${DEMO.holdWaiting}::uuid, ${userId}::uuid, ${BOOK.os}::uuid, 'WAITING',
      ${isoDaysAgo(2)}::timestamptz, ${isoDaysAgo(2)}::timestamptz
    )
  `);

  await db.execute(sql`
    INSERT INTO reservations (
      id, user_id, book_id, status, ready_expires_at, updated_by,
      created_at, updated_at
    ) VALUES (
      ${DEMO.holdReady}::uuid, ${userId}::uuid, ${BOOK.algorithms}::uuid, 'READY',
      ${isoDaysFromNow(2)}::timestamptz, 'test@admin.com',
      ${isoDaysAgo(1)}::timestamptz, ${isoDaysAgo(0)}::timestamptz
    )
  `);
  await db.execute(sql`
    UPDATE books SET available_copies = GREATEST(available_copies - 1, 0)
    WHERE id = ${BOOK.algorithms}::uuid
  `);
  await db.execute(sql`
    INSERT INTO reservation_events (
      reservation_id, event_type, event_key, delivered_at, created_at
    ) VALUES (
      ${DEMO.holdReady}::uuid, 'HOLD_READY',
      ${`hold-ready-${DEMO.holdReady}`},
      ${isoDaysAgo(0)}::timestamptz, ${isoDaysAgo(0)}::timestamptz
    )
  `);

  await db.execute(sql`
    INSERT INTO reservations (
      id, user_id, book_id, status, ready_expires_at, updated_by,
      created_at, updated_at
    ) VALUES (
      ${DEMO.holdExpired}::uuid, ${userId}::uuid, ${BOOK.cracking}::uuid, 'EXPIRED',
      ${isoDaysAgo(1)}::timestamptz, 'system',
      ${isoDaysAgo(5)}::timestamptz, ${isoDaysAgo(1)}::timestamptz
    )
  `);

  await db.execute(sql`
    INSERT INTO reservations (
      id, user_id, book_id, status, fulfilled_borrow_id, updated_by,
      created_at, updated_at
    ) VALUES (
      ${DEMO.holdFulfilled}::uuid, ${userId}::uuid, ${BOOK.html}::uuid, 'FULFILLED',
      ${DEMO.borrowOnTime}::uuid, 'test@admin.com',
      ${isoDaysAgo(10)}::timestamptz, ${isoDaysAgo(3)}::timestamptz
    )
  `);
  console.log("  ✓ reservations (WAITING / READY / EXPIRED / FULFILLED + event)");

  // ── Reviews (PENDING / APPROVED / REJECTED; user + admin author) ───────────
  await db.execute(sql`
    INSERT INTO book_reviews (
      id, book_id, user_id, rating, comment, status, created_at, updated_at
    ) VALUES (
      ${DEMO.reviewPending}::uuid, ${BOOK.css}::uuid, ${userId}::uuid, 5,
      'Deep CSS coverage — awaiting moderation.',
      'PENDING', ${isoDaysAgo(2)}::timestamptz, ${isoDaysAgo(2)}::timestamptz
    )
  `);
  await db.execute(sql`
    INSERT INTO book_reviews (
      id, book_id, user_id, rating, comment, status,
      reviewed_by, reviewed_at, created_at, updated_at
    ) VALUES (
      ${DEMO.reviewApproved}::uuid, ${BOOK.html}::uuid, ${userId}::uuid, 4,
      'Great beginner-friendly layout examples.',
      'APPROVED', ${adminId}::uuid, ${isoDaysAgo(1)}::timestamptz,
      ${isoDaysAgo(5)}::timestamptz, ${isoDaysAgo(1)}::timestamptz
    )
  `);
  await db.execute(sql`
    INSERT INTO book_reviews (
      id, book_id, user_id, rating, comment, status,
      reviewed_by, reviewed_at, created_at, updated_at
    ) VALUES (
      ${DEMO.reviewRejected}::uuid, ${BOOK.system}::uuid, ${userId}::uuid, 2,
      'Too interview-focused for casual readers.',
      'REJECTED', ${adminId}::uuid, ${isoDaysAgo(3)}::timestamptz,
      ${isoDaysAgo(4)}::timestamptz, ${isoDaysAgo(3)}::timestamptz
    )
  `);
  await db.execute(sql`
    INSERT INTO book_reviews (
      id, book_id, user_id, rating, comment, status,
      reviewed_by, reviewed_at, created_at, updated_at
    ) VALUES (
      ${DEMO.reviewAdmin}::uuid, ${BOOK.algorithms}::uuid, ${adminId}::uuid, 5,
      'Staff pick — canonical algorithms reference.',
      'APPROVED', ${adminId}::uuid, ${isoDaysAgo(7)}::timestamptz,
      ${isoDaysAgo(8)}::timestamptz, ${isoDaysAgo(7)}::timestamptz
    )
  `);
  console.log("  ✓ book_reviews (PENDING / APPROVED / REJECTED)");

  // ── Admin privilege request (user → pending) ─────────────────────────────
  await db.execute(sql`
    INSERT INTO admin_requests (
      id, user_id, request_reason, status, created_at, updated_at
    ) VALUES (
      ${DEMO.adminReqPending}::uuid, ${userId}::uuid,
      'I volunteer for weekend circulation desk support and catalog QA.',
      'PENDING', ${isoDaysAgo(6)}::timestamptz, ${isoDaysAgo(6)}::timestamptz
    )
  `);
  console.log("  ✓ admin_requests (PENDING)");

  // ── Support tickets (all statuses + replies + related book) ──────────────
  await db.execute(sql`
    INSERT INTO support_tickets (
      id, subject, description, status, priority, user_id,
      related_book_id, created_at, updated_at
    ) VALUES (
      ${DEMO.ticketOpen}::uuid,
      'Cannot renew overdue loan',
      'Renew button disabled on System Design Interview — please advise.',
      'OPEN', 'HIGH', ${userId}::uuid, ${BOOK.system}::uuid,
      ${isoDaysAgo(3)}::timestamptz, ${isoDaysAgo(3)}::timestamptz
    )
  `);

  await db.execute(sql`
    INSERT INTO support_tickets (
      id, subject, description, status, priority, user_id,
      assigned_to_id, updated_by, related_book_id, notes,
      created_at, updated_at
    ) VALUES (
      ${DEMO.ticketProgress}::uuid,
      'Fine dispute — Assembly Language borrow',
      'I believe the 45-day overdue fine was calculated incorrectly.',
      'IN_PROGRESS', 'URGENT', ${userId}::uuid,
      ${adminId}::uuid, ${adminId}::uuid, ${BOOK.assembly}::uuid,
      'Verify rate history pro-rata before responding.',
      ${isoDaysAgo(5)}::timestamptz, ${isoDaysAgo(1)}::timestamptz
    )
  `);

  await db.execute(sql`
    INSERT INTO support_tickets (
      id, subject, description, status, priority, user_id,
      assigned_to_id, updated_by, created_at, updated_at
    ) VALUES (
      ${DEMO.ticketResolved}::uuid,
      'Missing hold notification email',
      'READY hold email arrived late — resolved after spam filter fix.',
      'RESOLVED', 'MEDIUM', ${userId}::uuid,
      ${adminId}::uuid, ${adminId}::uuid,
      ${isoDaysAgo(12)}::timestamptz, ${isoDaysAgo(4)}::timestamptz
    )
  `);

  await db.execute(sql`
    INSERT INTO support_tickets (
      id, subject, description, status, priority, user_id,
      assigned_to_id, updated_by, created_at, updated_at
    ) VALUES (
      ${DEMO.ticketClosed}::uuid,
      'Catalog suggestion — more Rust titles',
      'Closed — collection request logged for next acquisition cycle.',
      'CLOSED', 'LOW', ${userId}::uuid,
      ${adminId}::uuid, ${adminId}::uuid,
      ${isoDaysAgo(20)}::timestamptz, ${isoDaysAgo(10)}::timestamptz
    )
  `);

  await db.execute(sql`
    INSERT INTO support_ticket_replies (ticket_id, user_id, body, created_at)
    VALUES
      (
        ${DEMO.ticketProgress}::uuid, ${userId}::uuid,
        'Attaching my borrow id for reference — happy to provide receipt.',
        ${isoDaysAgo(4)}::timestamptz
      ),
      (
        ${DEMO.ticketProgress}::uuid, ${adminId}::uuid,
        'Thanks — reviewing rate history and will adjust if needed.',
        ${isoDaysAgo(1)}::timestamptz
      )
  `);
  console.log("  ✓ support_tickets (OPEN/IN_PROGRESS/RESOLVED/CLOSED + replies)");

  // ── In-app notifications (both users, read + unread) ───────────────────
  await db.execute(sql`
    INSERT INTO notifications (
      user_id, type, title, message, link, is_read, read_at, created_at
    ) VALUES
      (
        ${userId}::uuid, 'BORROW_APPROVED', 'Borrow approved',
        'Your request for HTML and CSS was approved.',
        '/my-profile?tab=borrows', true, ${isoDaysAgo(2)}::timestamptz,
        ${isoDaysAgo(3)}::timestamptz
      ),
      (
        ${userId}::uuid, 'REMINDER_DUE', 'Due soon reminder',
        'System Design Interview is due in 3 days.',
        '/my-profile?tab=borrows', false, NULL,
        ${isoDaysAgo(1)}::timestamptz
      ),
      (
        ${userId}::uuid, 'HOLD_READY', 'Hold ready',
        'Algorithms is ready to claim — expires in 48 hours.',
        '/my-profile?tab=holds', false, NULL,
        ${isoDaysAgo(0)}::timestamptz
      ),
      (
        ${userId}::uuid, 'TICKET_REPLY', 'Support reply',
        'Admin replied on your fine dispute ticket.',
        ${`/support-tickets/${DEMO.ticketProgress}`}, false, NULL,
        ${isoDaysAgo(1)}::timestamptz
      ),
      (
        ${adminId}::uuid, 'TICKET_CREATED', 'New support ticket',
        'Test User submitted: Cannot renew overdue loan',
        ${`/admin/support-tickets/${DEMO.ticketOpen}`}, false, NULL,
        ${isoDaysAgo(3)}::timestamptz
      ),
      (
        ${adminId}::uuid, 'REVIEW_PENDING', 'Review pending',
        'New review awaiting moderation on CSS in Depth.',
        '/admin/book-reviews', true, ${isoDaysAgo(1)}::timestamptz,
        ${isoDaysAgo(2)}::timestamptz
      )
  `);
  console.log("  ✓ notifications (user + admin, read/unread)");

  // ── Activity log (linked entity ids for detail pages) ────────────────────
  await db.execute(sql`
    INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, details, created_at)
    VALUES
      (
        ${adminId}::uuid, 'UPDATE', 'borrow', ${DEMO.borrowOnTime}::uuid,
        ${JSON.stringify({ subject: "Approved borrow — HTML and CSS" })}::jsonb,
        ${isoDaysAgo(3)}::timestamptz
      ),
      (
        ${userId}::uuid, 'CREATE', 'ticket', ${DEMO.ticketOpen}::uuid,
        ${JSON.stringify({ subject: "Cannot renew overdue loan" })}::jsonb,
        ${isoDaysAgo(3)}::timestamptz
      ),
      (
        ${adminId}::uuid, 'UPDATE', 'review', ${DEMO.reviewApproved}::uuid,
        ${JSON.stringify({ subject: "Approved review — HTML and CSS" })}::jsonb,
        ${isoDaysAgo(1)}::timestamptz
      ),
      (
        ${adminId}::uuid, 'UPDATE', 'ticket', ${DEMO.ticketProgress}::uuid,
        ${JSON.stringify({ subject: "Claimed ticket — fine dispute" })}::jsonb,
        ${isoDaysAgo(1)}::timestamptz
      ),
      (
        ${userId}::uuid, 'CREATE', 'reservation', ${DEMO.holdWaiting}::uuid,
        ${JSON.stringify({ note: "Joined waitlist — Operating System Concepts" })}::jsonb,
        ${isoDaysAgo(2)}::timestamptz
      ),
      (
        ${adminId}::uuid, 'UPDATE', 'user', ${userId}::uuid,
        ${JSON.stringify({ note: "Signup approved — demo ledger" })}::jsonb,
        ${isoDaysAgo(90, 9)}::timestamptz
      )
  `);
  console.log("  ✓ activity_logs (linked entities)");

  // ── Sample telemetry (Insights / API status surfaces) ────────────────────
  await db.execute(sql`
    INSERT INTO operation_telemetry (operation, kind, outcome, duration_ms, created_at)
    VALUES
      ('borrow.approve', 'mutation', 'success', 42, ${isoDaysAgo(3)}::timestamptz),
      ('reservation.claim', 'mutation', 'success', 88, ${isoDaysAgo(1)}::timestamptz),
      ('fine.stamp', 'cron', 'success', 1205, ${isoDaysAgo(0, 8)}::timestamptz)
  `);
  console.log("  ✓ operation_telemetry");

  console.log("\nseed-demo-ops complete.");
  console.log("  Accounts: test@user.com + test@admin.com");
  console.log("  Verify: /admin/business-insights, /admin/book-requests, /admin/users");
  console.log("  Empty queues: npm run seed:reset");
  await pool.end();
}

main().catch((err) => {
  console.error("seed-demo-ops failed:", err);
  process.exit(1);
});
