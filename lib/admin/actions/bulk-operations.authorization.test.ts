// Parent: REQ-0025; TC-0039

import { beforeAll, describe, expect, it, vi } from "vitest";

const requireAdminActor = vi.hoisted(() => vi.fn());
const database = vi.hoisted(() => ({
  update: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/database/drizzle", () => ({ db: database }));
vi.mock("@/database/schema", () => ({
  books: {},
  users: {},
  borrowRecords: {},
  bookReviews: {},
}));
vi.mock("@/lib/auth/authorization", () => ({
  requireAdminActor,
  getActionErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));
vi.mock("../borrowLifecycle", () => ({
  approveBorrowRecords: vi.fn(),
  rejectBorrowRecords: vi.fn(),
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
  sql: vi.fn(),
}));

type BulkOperations = typeof import("./bulk-operations");
let operations: BulkOperations;

beforeAll(async () => {
  operations = await import("./bulk-operations");
});

describe("bulk admin mutation boundary", () => {
  it("authenticates before revealing empty-input validation", async () => {
    requireAdminActor.mockRejectedValue(new Error("Authentication required"));

    const results = await Promise.all([
      operations.bulkUpdateBooks([], { isActive: true }),
      operations.bulkDeleteBooks([], "secret"),
      operations.bulkUpdateUsers([], { status: "APPROVED" }),
      operations.bulkApproveBorrowRequests([]),
      operations.bulkRejectBorrowRequests([]),
    ]);

    expect(requireAdminActor).toHaveBeenCalledTimes(5);
    expect(results.every((result) =>
      ("message" in result ? result.message : undefined) ===
      "Authentication required"
    )).toBe(true);
    expect(database.update).not.toHaveBeenCalled();
    expect(database.transaction).not.toHaveBeenCalled();
  });
});
