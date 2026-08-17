// Parent: REQ-0025; TC-0043 and TC-0044
// Opt-in integration suite: TEST_DATABASE_URL must point to a disposable database.

import { Pool } from "pg";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integration = testDatabaseUrl ? describe : describe.skip;
const actor = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "admin@example.test",
  name: "Admin",
  role: "ADMIN" as const,
  status: "APPROVED" as const,
  universityCard: null as string | null,
};
const readerActor = {
  id: "10000000-0000-4000-8000-000000000002",
  email: "reader@example.test",
  name: "Reader",
  role: "USER" as const,
  status: "APPROVED" as const,
  universityCard: null as string | null,
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
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
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
        video_url text, summary text NOT NULL, is_active boolean NOT NULL,
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
      CREATE TABLE IF NOT EXISTS reservations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
        book_id uuid NOT NULL, status text NOT NULL DEFAULT 'WAITING',
        ready_expires_at timestamptz, fulfilled_borrow_id uuid,
        updated_by text, created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS reservations_one_active_user_book
        ON reservations (user_id, book_id) WHERE status IN ('WAITING', 'READY');
      CREATE TABLE IF NOT EXISTS reservation_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reservation_id uuid NOT NULL,
        event_type text NOT NULL, event_key text NOT NULL UNIQUE,
        attempt_count integer NOT NULL DEFAULT 0,
        next_attempt_at timestamptz NOT NULL DEFAULT now(), locked_at timestamptz,
        last_error text, provider text, provider_message_id text,
        dead_lettered_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz
      );
      ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
      ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
      ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS locked_at timestamptz;
      ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS last_error text;
      ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS provider text;
      ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS provider_message_id text;
      ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz;
      CREATE TABLE IF NOT EXISTS circulation_commands (
        id uuid PRIMARY KEY, actor_id uuid NOT NULL, operation text NOT NULL,
        entity_id uuid NOT NULL, result jsonb, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS system_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL,
        value text NOT NULL, description text, updated_at timestamptz,
        updated_by text, created_at timestamptz
      );
      ALTER TABLE borrow_records ADD COLUMN IF NOT EXISTS fine_status text NOT NULL DEFAULT 'NONE';
      CREATE TABLE IF NOT EXISTS fine_rate_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        rate numeric(10,2) NOT NULL,
        effective_from date NOT NULL,
        created_by text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  });

  beforeEach(async () => {
    if (!testDatabaseUrl) return;
    await setupPool.query(
      "DROP TRIGGER IF EXISTS fail_book_delete ON books; DROP TRIGGER IF EXISTS fail_request_update ON admin_requests; DROP FUNCTION IF EXISTS raise_test_failure(); TRUNCATE circulation_commands, reservation_events, reservations, fine_rate_history, system_config, book_reviews, admin_requests, borrow_records, books, users;",
    );
    await setupPool.query(
      `INSERT INTO users (id, full_name, email, university_id, password, university_card, status, role)
       VALUES ($1, 'Admin', 'admin@example.test', 1, 'x', 'x', 'APPROVED', 'ADMIN'),
              ($2, 'Reader', 'reader@example.test', 2, 'x', 'x', 'APPROVED', 'USER')`,
      [actor.id, readerId],
    );
    await setupPool.query(
      `INSERT INTO books (id, title, author, genre, rating, cover_url, cover_color,
       description, total_copies, available_copies, video_url, summary, is_active, is_featured)
       VALUES ($1, 'Book', 'Author', 'Demo', 5, 'cover', '#000000', 'desc', 1, 1, 'video', 'summary', true, false)`,
      [bookId],
    );
  });

  afterAll(async () => {
    await setupPool.end();
  });

  it("serializes duplicate approvals and returns without inventory drift", async () => {
    await setupPool.query(
      `INSERT INTO borrow_records (id, user_id, book_id, borrow_date, status, renewal_count)
       VALUES ($1, $2, $3, now(), 'PENDING', 0)`,
      [recordId, readerId, bookId],
    );
    const { approveBorrowRecord, returnBorrowRecord } =
      await import("./borrowLifecycle");

    const approvals = await Promise.all([
      approveBorrowRecord(recordId, actor),
      approveBorrowRecord(recordId, actor),
    ]);
    expect(approvals.filter((result) => result.success)).toHaveLength(1);
    expect(
      (
        await setupPool.query(
          "SELECT available_copies FROM books WHERE id = $1",
          [bookId],
        )
      ).rows[0].available_copies,
    ).toBe(0);

    const returns = await Promise.all([
      returnBorrowRecord(recordId, actor, 1),
      returnBorrowRecord(recordId, actor, 1),
    ]);
    expect(returns.filter((result) => result.success)).toHaveLength(1);
    const finalState = await setupPool.query(
      "SELECT b.available_copies, r.status FROM books b JOIN borrow_records r ON r.book_id = b.id WHERE r.id = $1",
      [recordId],
    );
    expect(finalState.rows[0]).toMatchObject({
      available_copies: 1,
      status: "RETURNED",
    });
  });

  it("rolls back role escalation when request persistence fails", async () => {
    await setupPool.query(
      "INSERT INTO admin_requests (id, user_id, request_reason, status) VALUES ($1, $2, 'help', 'PENDING')",
      [requestId, readerId],
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
      [requestId],
    );
    expect(state.rows[0]).toMatchObject({ role: "USER", status: "PENDING" });
  });

  it("attributes direct role and fine writes to the authenticated admin", async () => {
    const { updateUserRole } = await import("./actions/user");
    expect((await updateUserRole(readerId, "ADMIN")).success).toBe(true);

    // All Users promote must write admin_requests (direct-grant or pending approve).
    const ledger = await setupPool.query(
      "SELECT status, request_reason, reviewed_by FROM admin_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [readerId],
    );
    expect(ledger.rows[0]).toMatchObject({
      status: "APPROVED",
      reviewed_by: actor.id,
    });
    expect(String(ledger.rows[0].request_reason).length).toBeGreaterThanOrEqual(
      10,
    );

    await setupPool.query(
      `INSERT INTO borrow_records (id, user_id, book_id, borrow_date, due_date, status, renewal_count)
       VALUES ($1, $2, $3, now(), current_date - 2, 'BORROWED', 0)`,
      [recordId, readerId, bookId],
    );
    const { updateOverdueFines } = await import("./actions/borrow");
    await updateOverdueFines(1);

    const audit = await setupPool.query(
      "SELECT u.updated_by user_actor, r.updated_by fine_actor FROM users u JOIN borrow_records r ON r.user_id = u.id WHERE u.id = $1",
      [readerId],
    );
    expect(audit.rows[0]).toMatchObject({
      user_actor: actor.email,
      fine_actor: actor.email,
    });
  });

  it("promotes pending admin request via updateUserRole and demotes with ledger revoke", async () => {
    await setupPool.query(
      "INSERT INTO admin_requests (id, user_id, request_reason, status, created_at) VALUES ($1, $2, 'I need admin for library ops.', 'PENDING', now())",
      [requestId, readerId],
    );
    const { updateUserRole } = await import("./actions/user");
    const { removeAdminPrivileges } = await import("./actions/admin-requests");

    expect((await updateUserRole(readerId, "ADMIN")).success).toBe(true);
    const approved = await setupPool.query(
      "SELECT u.role, r.status, r.reviewed_by FROM users u JOIN admin_requests r ON r.id = $1 WHERE u.id = $2",
      [requestId, readerId],
    );
    expect(approved.rows[0]).toMatchObject({
      role: "ADMIN",
      status: "APPROVED",
      reviewed_by: actor.id,
    });

    expect((await removeAdminPrivileges(readerId)).success).toBe(true);
    const demoted = await setupPool.query(
      "SELECT u.role, r.status, r.rejection_reason FROM users u JOIN admin_requests r ON r.id = $1 WHERE u.id = $2",
      [requestId, readerId],
    );
    expect(demoted.rows[0].role).toBe("USER");
    expect(demoted.rows[0].status).toBe("REJECTED");
    expect(String(demoted.rows[0].rejection_reason)).toContain("removed");
  });

  it("rolls back dependent deletes when the book delete fails", async () => {
    await setupPool.query(
      `INSERT INTO borrow_records (id, user_id, book_id, borrow_date, status, renewal_count)
       VALUES ($1, $2, $3, now(), 'RETURNED', 0)`,
      [recordId, readerId, bookId],
    );
    await setupPool.query(
      `INSERT INTO book_reviews (id, book_id, user_id, rating, comment)
       VALUES ($1, $2, $3, 5, 'good')`,
      [reviewId, bookId, readerId],
    );
    await setupPool.query(`
      CREATE FUNCTION raise_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected delete failure'; END $$;
      CREATE TRIGGER fail_book_delete BEFORE DELETE ON books
      FOR EACH ROW EXECUTE FUNCTION raise_test_failure();
    `);
    const { bulkDeleteBooks } = await import("./actions/bulk-operations");

    expect(
      (await bulkDeleteBooks([bookId], "integration-delete-secret")).success,
    ).toBe(false);
    const counts = await setupPool.query(
      "SELECT (SELECT count(*)::int FROM books) books, (SELECT count(*)::int FROM borrow_records) borrows, (SELECT count(*)::int FROM book_reviews) reviews",
    );
    expect(counts.rows[0]).toMatchObject({ books: 1, borrows: 1, reviews: 1 });
  });

  it("rejects duplicate active reservations at the database boundary", async () => {
    await setupPool.query(
      "UPDATE books SET available_copies = 0 WHERE id = $1",
      [bookId],
    );
    const { createReservation } =
      await import("@/lib/circulation/reservations");

    const results = await Promise.all([
      createReservation(bookId, readerActor),
      createReservation(bookId, readerActor),
    ]);

    expect(results.filter((result) => result.success)).toHaveLength(1);
    const state = await setupPool.query(
      "SELECT count(*)::int AS count FROM reservations WHERE user_id = $1 AND book_id = $2 AND status IN ('WAITING', 'READY')",
      [readerId, bookId],
    );
    expect(state.rows[0].count).toBe(1);
  });

  it("allocates a returned copy to the earliest reservation atomically", async () => {
    const secondReaderId = "10000000-0000-4000-8000-000000000003";
    await setupPool.query(
      `INSERT INTO users (id, full_name, email, university_id, password, university_card, status, role)
       VALUES ($1, 'Second Reader', 'second@example.test', 3, 'x', 'x', 'APPROVED', 'USER')`,
      [secondReaderId],
    );
    await setupPool.query(
      "UPDATE books SET available_copies = 0 WHERE id = $1",
      [bookId],
    );
    await setupPool.query(
      `INSERT INTO borrow_records (id, user_id, book_id, borrow_date, status, renewal_count)
       VALUES ($1, $2, $3, now(), 'BORROWED', 0)`,
      [recordId, readerId, bookId],
    );
    await setupPool.query(
      `INSERT INTO reservations (id, user_id, book_id, status, created_at)
       VALUES ('60000000-0000-4000-8000-000000000002', $1, $3, 'WAITING', now() - interval '1 minute'),
              ('60000000-0000-4000-8000-000000000001', $2, $3, 'WAITING', now() - interval '2 minutes')`,
      [secondReaderId, actor.id, bookId],
    );
    const { returnBorrowRecord } = await import("./borrowLifecycle");

    expect((await returnBorrowRecord(recordId, actor, 1)).success).toBe(true);
    const reservationsState = await setupPool.query(
      "SELECT user_id, status FROM reservations ORDER BY created_at, id",
    );
    const bookState = await setupPool.query(
      "SELECT available_copies FROM books WHERE id = $1",
      [bookId],
    );
    expect(reservationsState.rows).toEqual([
      { user_id: actor.id, status: "READY" },
      { user_id: secondReaderId, status: "WAITING" },
    ]);
    expect(bookState.rows[0].available_copies).toBe(0);
    const events = await setupPool.query(
      "SELECT event_type FROM reservation_events",
    );
    expect(events.rows).toEqual([{ event_type: "RESERVATION_READY" }]);
  });

  it("renews by policy and denies renewal when another user is waiting", async () => {
    await setupPool.query(
      "INSERT INTO system_config (key, value) VALUES ('borrow_duration_days', '10'), ('max_renewals', '2')",
    );
    await setupPool.query(
      `INSERT INTO borrow_records (id, user_id, book_id, borrow_date, due_date, status, renewal_count)
       VALUES ($1, $2, $3, now(), current_date + 5, 'BORROWED', 0)`,
      [recordId, readerId, bookId],
    );
    const { renewBorrow } = await import("@/lib/circulation/reservations");

    const commandId = "70000000-0000-4000-8000-000000000001";
    const renewed = await renewBorrow(recordId, readerActor, commandId);
    expect(renewed.success && renewed.data.renewalCount).toBe(1);
    const replayed = await renewBorrow(recordId, readerActor, commandId);
    expect(replayed).toEqual(renewed);
    await setupPool.query(
      "INSERT INTO reservations (user_id, book_id, status) VALUES ($1, $2, 'WAITING')",
      [actor.id, bookId],
    );
    expect((await renewBorrow(recordId, readerActor)).success).toBe(false);
    const state = await setupPool.query(
      "SELECT renewal_count FROM borrow_records WHERE id = $1",
      [recordId],
    );
    expect(state.rows[0].renewal_count).toBe(1);
  });

  it("uses the production claim once and rejects cancellation during delivery", async () => {
    const reservationId = "60000000-0000-4000-8000-000000000001";
    await setupPool.query(
      "INSERT INTO reservations (id, user_id, book_id, status, ready_expires_at) VALUES ($1, $2, $3, 'READY', now() + interval '1 hour')",
      [reservationId, readerId, bookId],
    );
    await setupPool.query(
      "INSERT INTO reservation_events (reservation_id, event_type, event_key) VALUES ($1, 'RESERVATION_READY', $2)",
      [reservationId, `${reservationId}:READY`],
    );

    const { claimReservationEvents, sendReservationReadyEmail } =
      await import("@/lib/circulation/reservationOutbox");
    const claims = await Promise.all([
      claimReservationEvents(1),
      claimReservationEvents(1),
    ]);
    expect(claims.flat()).toHaveLength(1);
    const item = claims.flat()[0];
    expect(item.attemptCount).toBe(1);

    let allowDelivery!: () => void;
    const deliveryGate = new Promise<void>((resolve) => {
      allowDelivery = resolve;
    });
    let providerStarted!: () => void;
    const providerStart = new Promise<void>((resolve) => {
      providerStarted = resolve;
    });
    const delivery = sendReservationReadyEmail(item, async () => {
      providerStarted();
      await deliveryGate;
      return { messageId: "message-1", provider: "Resend" };
    });
    await providerStart;

    const cancellation = import("@/lib/circulation/reservations").then(
      ({ cancelReservation }) => cancelReservation(reservationId, readerActor),
    );
    await expect(cancellation).resolves.toMatchObject({
      success: false,
      error: "Notification delivery is finishing; retry shortly",
    });
    allowDelivery();
    await expect(delivery).resolves.toEqual({
      messageId: "message-1",
      provider: "Resend",
    });
    await setupPool.query(
      "UPDATE reservation_events SET delivered_at = now(), locked_at = NULL WHERE reservation_id = $1",
      [reservationId],
    );
    const { cancelReservation } =
      await import("@/lib/circulation/reservations");
    await expect(
      cancelReservation(reservationId, readerActor),
    ).resolves.toMatchObject({ success: true });
  });

  it("expires READY reservations independently and reallocates the held copy", async () => {
    const expiredId = "60000000-0000-4000-8000-000000000002";
    const waitingId = "60000000-0000-4000-8000-000000000003";
    await setupPool.query(
      "UPDATE books SET available_copies = 0 WHERE id = $1",
      [bookId],
    );
    await setupPool.query(
      `INSERT INTO reservations (id, user_id, book_id, status, ready_expires_at, created_at)
       VALUES ($1, $2, $3, 'READY', CURRENT_TIMESTAMP - interval '1 second', CURRENT_TIMESTAMP - interval '2 hours'),
              ($4, $5, $3, 'WAITING', NULL, CURRENT_TIMESTAMP - interval '1 hour')`,
      [expiredId, readerId, bookId, waitingId, actor.id],
    );
    const { expireReadyReservations } =
      await import("@/lib/circulation/reservations");

    await expect(expireReadyReservations()).resolves.toBe(1);
    const state = await setupPool.query(
      "SELECT id, status FROM reservations ORDER BY id",
    );
    expect(state.rows).toEqual([
      { id: expiredId, status: "EXPIRED" },
      { id: waitingId, status: "READY" },
    ]);
    const inventory = await setupPool.query(
      "SELECT available_copies FROM books WHERE id = $1",
      [bookId],
    );
    expect(inventory.rows[0].available_copies).toBe(0);
    const events = await setupPool.query(
      "SELECT reservation_id FROM reservation_events",
    );
    expect(events.rows).toEqual([{ reservation_id: waitingId }]);
  });

  it("expires an elapsed READY hold instead of allowing cancellation", async () => {
    const reservationId = "60000000-0000-4000-8000-000000000004";
    await setupPool.query(
      "UPDATE books SET available_copies = 0 WHERE id = $1",
      [bookId],
    );
    await setupPool.query(
      `INSERT INTO reservations (id, user_id, book_id, status, ready_expires_at)
       VALUES ($1, $2, $3, 'READY', CURRENT_TIMESTAMP - interval '1 microsecond')`,
      [reservationId, readerId, bookId],
    );
    const { cancelReservation } =
      await import("@/lib/circulation/reservations");

    await expect(
      cancelReservation(reservationId, readerActor),
    ).resolves.toEqual({ success: false, error: "Reservation has expired" });
    const state = await setupPool.query(
      "SELECT status FROM reservations WHERE id = $1",
      [reservationId],
    );
    expect(state.rows[0].status).toBe("EXPIRED");
    const inventory = await setupPool.query(
      "SELECT available_copies FROM books WHERE id = $1",
      [bookId],
    );
    expect(inventory.rows[0].available_copies).toBe(1);
  });

  it("waive/adjust/paid/stamp/sync fine lifecycle invariants", async () => {
    const fineRecordId = "30000000-0000-4000-8000-000000000002";
    await setupPool.query(
      `INSERT INTO borrow_records (id, user_id, book_id, borrow_date, due_date, status, renewal_count, fine_status, fine_amount)
       VALUES ($1, $2, $3, now() - interval '10 days', CURRENT_DATE - 3, 'BORROWED', 0, 'ACCRUING', '0.00')`,
      [fineRecordId, readerId, bookId],
    );
    await setupPool.query(
      `INSERT INTO system_config (key, value) VALUES ('daily_fine_amount', '1.00')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    );

    const { waiveBorrowFine, adjustBorrowFine, markFinePaid, stampOpenOverdueFines, syncOverdueAccruingStatus } =
      await import("./actions/fines");

    const waived = await waiveBorrowFine(fineRecordId, "integration test");
    expect(waived.success).toBe(true);
    const waivedRow = await setupPool.query(
      "SELECT fine_status, fine_amount FROM borrow_records WHERE id = $1",
      [fineRecordId],
    );
    expect(waivedRow.rows[0]).toMatchObject({
      fine_status: "WAIVED",
      fine_amount: "0.00",
    });

    await setupPool.query(
      "UPDATE borrow_records SET fine_status = 'ACCRUING', fine_amount = '2.50' WHERE id = $1",
      [fineRecordId],
    );
    const adjusted = await adjustBorrowFine(fineRecordId, 4.25, "manual");
    expect(adjusted.success).toBe(true);
    const adjustedRow = await setupPool.query(
      "SELECT fine_status, fine_amount FROM borrow_records WHERE id = $1",
      [fineRecordId],
    );
    expect(adjustedRow.rows[0]).toMatchObject({
      fine_status: "ACCRUING",
      fine_amount: "4.25",
    });

    const paid = await markFinePaid(fineRecordId);
    expect(paid.success).toBe(true);
    const paidRow = await setupPool.query(
      "SELECT fine_status, fine_amount FROM borrow_records WHERE id = $1",
      [fineRecordId],
    );
    expect(paidRow.rows[0].fine_status).toBe("PAID");

    await setupPool.query(
      "UPDATE borrow_records SET fine_status = 'WAIVED', fine_amount = '0.00' WHERE id = $1",
      [fineRecordId],
    );
    const stampWaived = await stampOpenOverdueFines({ force: true });
    expect(stampWaived.skipped).toBeGreaterThanOrEqual(1);

    const accruingRecordId = "30000000-0000-4000-8000-000000000003";
    await setupPool.query(
      `INSERT INTO borrow_records (id, user_id, book_id, borrow_date, due_date, status, renewal_count, fine_status, fine_amount)
       VALUES ($1, $2, $3, now() - interval '5 days', CURRENT_DATE - 1, 'BORROWED', 0, 'NONE', '0.00')`,
      [accruingRecordId, readerId, bookId],
    );
    const sync = await syncOverdueAccruingStatus();
    expect(sync.synced).toBeGreaterThanOrEqual(1);
    const syncedRow = await setupPool.query(
      "SELECT fine_status FROM borrow_records WHERE id = $1",
      [accruingRecordId],
    );
    expect(syncedRow.rows[0].fine_status).toBe("ACCRUING");
  });
});
