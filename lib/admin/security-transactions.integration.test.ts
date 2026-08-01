// Parent: REQ-0025; TC-0043 and TC-0044
// Opt-in integration suite: TEST_DATABASE_URL must point to a disposable database.

import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integration = testDatabaseUrl ? describe : describe.skip;
const actor = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "admin@example.test",
  name: "Admin",
  role: "ADMIN" as const,
  status: "APPROVED" as const,
};

vi.mock("@/lib/auth/authorization", () => ({
  requireAdminActor: vi.fn(async () => actor),
  requireAuthenticatedActor: vi.fn(async () => actor),
  assertOwnerOrAdmin: (currentActor: typeof actor, ownerId: string) => {
    if (currentActor.role !== "ADMIN" && currentActor.id !== ownerId) {
      throw new Error("You can only modify your own records");
    }
  },
  getActionErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));

integration("PostgreSQL lifecycle invariants", () => {
  const setupPool = new Pool({ connectionString: testDatabaseUrl });
  const readerId = "10000000-0000-4000-8000-000000000002";
  const bookId = "20000000-0000-4000-8000-000000000001";
  const recordId = "30000000-0000-4000-8000-000000000001";
  const requestId = "40000000-0000-4000-8000-000000000001";
  const reviewId = "50000000-0000-4000-8000-000000000001";

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.ADMIN_DELETE_SECRET = "integration-delete-secret";
    await setupPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY, full_name text NOT NULL, email text NOT NULL,
        university_id integer NOT NULL, password text NOT NULL,
        university_card text NOT NULL, status text, role text,
        updated_at timestamptz, updated_by text, created_at timestamptz
      );
      CREATE TABLE IF NOT EXISTS books (
        id uuid PRIMARY KEY, title text NOT NULL, author text NOT NULL,
        genre text NOT NULL, rating integer NOT NULL, cover_url text NOT NULL,
        cover_color text NOT NULL, description text NOT NULL,
        total_copies integer NOT NULL, available_copies integer NOT NULL,
        video_url text NOT NULL, summary text NOT NULL, is_active boolean NOT NULL,
        is_featured boolean NOT NULL, updated_at timestamptz, updated_by uuid,
        created_at timestamptz
      );
      CREATE TABLE IF NOT EXISTS borrow_records (
        id uuid PRIMARY KEY, user_id uuid NOT NULL, book_id uuid NOT NULL,
        borrow_date timestamptz NOT NULL, due_date date, return_date date,
        status text NOT NULL, borrowed_by text, returned_by text,
        fine_amount numeric(10,2), notes text, renewal_count integer NOT NULL,
        last_reminder_sent timestamptz, updated_at timestamptz,
        updated_by text, created_at timestamptz
      );
      CREATE TABLE IF NOT EXISTS admin_requests (
        id uuid PRIMARY KEY, user_id uuid NOT NULL, request_reason text NOT NULL,
        status text NOT NULL, reviewed_by uuid, reviewed_at timestamptz,
        rejection_reason text, created_at timestamptz, updated_at timestamptz
      );
      CREATE TABLE IF NOT EXISTS book_reviews (
        id uuid PRIMARY KEY, book_id uuid NOT NULL, user_id uuid NOT NULL,
        rating integer NOT NULL, comment text NOT NULL,
        created_at timestamptz, updated_at timestamptz
      );
    `);
  });

  beforeEach(async () => {
    if (!testDatabaseUrl) return;
    await setupPool.query(
      "DROP TRIGGER IF EXISTS fail_book_delete ON books; DROP TRIGGER IF EXISTS fail_request_update ON admin_requests; DROP FUNCTION IF EXISTS raise_test_failure(); TRUNCATE book_reviews, admin_requests, borrow_records, books, users;"
    );
    await setupPool.query(
      `INSERT INTO users (id, full_name, email, university_id, password, university_card, status, role)
       VALUES ($1, 'Admin', 'admin@example.test', 1, 'x', 'x', 'APPROVED', 'ADMIN'),
              ($2, 'Reader', 'reader@example.test', 2, 'x', 'x', 'APPROVED', 'USER')`,
      [actor.id, readerId]
    );
    await setupPool.query(
      `INSERT INTO books (id, title, author, genre, rating, cover_url, cover_color,
       description, total_copies, available_copies, video_url, summary, is_active, is_featured)
       VALUES ($1, 'Book', 'Author', 'Demo', 5, 'cover', '#000000', 'desc', 1, 1, 'video', 'summary', true, false)`,
      [bookId]
    );
  });

  afterAll(async () => {
    await setupPool.end();
  });

  it("serializes duplicate approvals and returns without inventory drift", async () => {
    await setupPool.query(
      `INSERT INTO borrow_records (id, user_id, book_id, borrow_date, status, renewal_count)
       VALUES ($1, $2, $3, now(), 'PENDING', 0)`,
      [recordId, readerId, bookId]
    );
    const { approveBorrowRecord, returnBorrowRecord } = await import("./borrowLifecycle");

    const approvals = await Promise.all([
      approveBorrowRecord(recordId, actor),
      approveBorrowRecord(recordId, actor),
    ]);
    expect(approvals.filter((result) => result.success)).toHaveLength(1);
    expect((await setupPool.query("SELECT available_copies FROM books WHERE id = $1", [bookId])).rows[0].available_copies).toBe(0);

    const returns = await Promise.all([
      returnBorrowRecord(recordId, actor, 1),
      returnBorrowRecord(recordId, actor, 1),
    ]);
    expect(returns.filter((result) => result.success)).toHaveLength(1);
    const finalState = await setupPool.query(
      "SELECT b.available_copies, r.status FROM books b JOIN borrow_records r ON r.book_id = b.id WHERE r.id = $1",
      [recordId]
    );
    expect(finalState.rows[0]).toMatchObject({ available_copies: 1, status: "RETURNED" });
  });

  it("rolls back role escalation when request persistence fails", async () => {
    await setupPool.query(
      "INSERT INTO admin_requests (id, user_id, request_reason, status) VALUES ($1, $2, 'help', 'PENDING')",
      [requestId, readerId]
    );
    await setupPool.query(`
      CREATE FUNCTION raise_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected request failure'; END $$;
      CREATE TRIGGER fail_request_update BEFORE UPDATE ON admin_requests
      FOR EACH ROW EXECUTE FUNCTION raise_test_failure();
    `);
    const { approveAdminRequest } = await import("./actions/admin-requests");

    expect((await approveAdminRequest(requestId)).success).toBe(false);
    const state = await setupPool.query(
      "SELECT u.role, r.status FROM users u JOIN admin_requests r ON r.user_id = u.id WHERE r.id = $1",
      [requestId]
    );
    expect(state.rows[0]).toMatchObject({ role: "USER", status: "PENDING" });
  });

  it("attributes direct role and fine writes to the authenticated admin", async () => {
    const { updateUserRole } = await import("./actions/user");
    expect((await updateUserRole(readerId, "ADMIN")).success).toBe(true);

    await setupPool.query(
      `INSERT INTO borrow_records (id, user_id, book_id, borrow_date, due_date, status, renewal_count)
       VALUES ($1, $2, $3, now(), current_date - 2, 'BORROWED', 0)`,
      [recordId, readerId, bookId]
    );
    const { updateOverdueFines } = await import("./actions/borrow");
    await updateOverdueFines(1);

    const audit = await setupPool.query(
      "SELECT u.updated_by user_actor, r.updated_by fine_actor FROM users u JOIN borrow_records r ON r.user_id = u.id WHERE u.id = $1",
      [readerId]
    );
    expect(audit.rows[0]).toMatchObject({
      user_actor: actor.email,
      fine_actor: actor.email,
    });
  });

  it("rolls back dependent deletes when the book delete fails", async () => {
    await setupPool.query(
      `INSERT INTO borrow_records (id, user_id, book_id, borrow_date, status, renewal_count)
       VALUES ($1, $2, $3, now(), 'RETURNED', 0)`,
      [recordId, readerId, bookId]
    );
    await setupPool.query(
      `INSERT INTO book_reviews (id, book_id, user_id, rating, comment)
       VALUES ($1, $2, $3, 5, 'good')`,
      [reviewId, bookId, readerId]
    );
    await setupPool.query(`
      CREATE FUNCTION raise_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected delete failure'; END $$;
      CREATE TRIGGER fail_book_delete BEFORE DELETE ON books
      FOR EACH ROW EXECUTE FUNCTION raise_test_failure();
    `);
    const { bulkDeleteBooks } = await import("./actions/bulk-operations");

    expect((await bulkDeleteBooks([bookId], "integration-delete-secret")).success).toBe(false);
    const counts = await setupPool.query(
      "SELECT (SELECT count(*)::int FROM books) books, (SELECT count(*)::int FROM borrow_records) borrows, (SELECT count(*)::int FROM book_reviews) reviews"
    );
    expect(counts.rows[0]).toMatchObject({ books: 1, borrows: 1, reviews: 1 });
  });
});
