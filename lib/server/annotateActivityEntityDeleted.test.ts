/**
 * Unit: annotateMissingActivityEntities marks gone hard-delete targets.
 * Parent: universal hard-delete activity unlink
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const selectMock = vi.fn();

vi.mock("@/database/drizzle", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
  },
}));

vi.mock("@/database/schema", () => ({
  books: { id: "books.id" },
  bookReviews: { id: "book_reviews.id" },
  supportTickets: { id: "support_tickets.id" },
  users: { id: "users.id" },
  borrowRecords: { id: "borrow_records.id" },
}));

vi.mock("drizzle-orm", () => ({
  inArray: vi.fn((col, ids) => ({ col, ids })),
}));

import { annotateMissingActivityEntities } from "@/lib/server/annotateActivityEntityDeleted";

function chainReturning(rows: { id: string }[]) {
  return {
    from: () => ({
      where: async () => rows,
    }),
  };
}

describe("annotateMissingActivityEntities", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("flags missing book/review/ticket and reservation bookId", async () => {
    // Order of Promise.all: books, reviews, tickets, users, borrows
    selectMock
      .mockReturnValueOnce(chainReturning([{ id: "b-alive" }]))
      .mockReturnValueOnce(chainReturning([]))
      .mockReturnValueOnce(chainReturning([]))
      .mockReturnValueOnce(chainReturning([{ id: "u1" }]))
      .mockReturnValueOnce(chainReturning([{ id: "br1" }]));

    const rows = await annotateMissingActivityEntities([
      {
        entityType: "book",
        entityId: "b-gone",
        details: { title: "Gone" },
      },
      {
        entityType: "book",
        entityId: "b-alive",
        details: { title: "Alive" },
      },
      {
        entityType: "reservation",
        entityId: "r1",
        details: { bookId: "b-gone" },
      },
      {
        entityType: "review",
        entityId: "rv-gone",
        details: null,
      },
      {
        entityType: "ticket",
        entityId: "t-gone",
        details: { subject: "Help" },
      },
      {
        entityType: "user",
        entityId: "u1",
        details: null,
      },
      {
        entityType: "borrow",
        entityId: "br1",
        details: { status: "CANCELLED" },
      },
    ]);

    expect(rows[0]?.details).toMatchObject({ entityDeleted: true });
    expect(rows[1]?.details).not.toMatchObject({ entityDeleted: true });
    expect(rows[2]?.details).toMatchObject({ entityDeleted: true });
    expect(rows[3]?.details).toMatchObject({ entityDeleted: true });
    expect(rows[4]?.details).toMatchObject({ entityDeleted: true });
    expect(rows[5]?.details).toBeNull();
    expect(rows[6]?.details).not.toMatchObject({ entityDeleted: true });
  });
});
