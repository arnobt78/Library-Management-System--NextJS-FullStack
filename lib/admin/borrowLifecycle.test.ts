// Parent: REQ-0025; TC-0044

import { beforeEach, describe, expect, it, vi } from "vitest";

const schema = vi.hoisted(() => ({
  books: { id: "books.id", totalCopies: "books.total", availableCopies: "books.available" },
  borrowRecords: {
    id: "borrow.id",
    bookId: "borrow.bookId",
    userId: "borrow.userId",
    status: "borrow.status",
    dueDate: "borrow.dueDate",
    borrowedBy: "borrow.borrowedBy",
  },
  users: { id: "users.id", email: "users.email" },
}));

const database = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("@/database/drizzle", () => ({ db: database }));
vi.mock("@/database/schema", () => schema);
vi.mock("@/lib/auth/authorization", () => ({
  assertOwnerOrAdmin: vi.fn(),
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => "and"),
  eq: vi.fn(() => "eq"),
  inArray: vi.fn(() => "inArray"),
  sql: vi.fn(() => "sql"),
}));

interface SelectChain {
  from: () => SelectChain;
  innerJoin: () => SelectChain;
  where: () => SelectChain;
  limit: () => SelectChain;
  for: () => Promise<unknown[]>;
}

interface UpdateChain {
  set: () => UpdateChain;
  where: () => UpdateChain;
  returning: () => Promise<Array<{ id: string }>>;
}

describe("borrow transaction rollback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("restores the borrow transition when the inventory write fails", async () => {
    const state = { status: "BORROWED", availableCopies: 0 };
    let selectIndex = 0;
    let updateIndex = 0;

    const transaction = {
      select: () => {
        const currentIndex = selectIndex;
        selectIndex += 1;
        const chain: SelectChain = {
          from: () => chain,
          innerJoin: () => chain,
          where: () => chain,
          limit: () => chain,
          for: async () =>
            currentIndex === 0
              ? [
                  {
                    bookId: "20000000-0000-4000-8000-000000000002",
                    userId: "10000000-0000-4000-8000-000000000001",
                    status: state.status,
                    dueDate: null,
                    borrowedBy: "reader@example.test",
                    userEmail: "reader@example.test",
                  },
                ]
              : [{ availableCopies: state.availableCopies, totalCopies: 1 }],
        };
        return chain;
      },
      update: () => {
        const currentIndex = updateIndex;
        updateIndex += 1;
        const chain: UpdateChain = {
          set: () => {
            if (currentIndex === 1) {
              throw new Error("simulated inventory failure");
            }
            return chain;
          },
          where: () => chain,
          returning: async () => {
            state.status = "RETURNED";
            return [{ id: "30000000-0000-4000-8000-000000000003" }];
          },
        };
        return chain;
      },
    };

    database.transaction.mockImplementation(async (operation) => {
      const snapshot = { ...state };
      try {
        return await operation(transaction);
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    });

    const { returnBorrowRecord } = await import("./borrowLifecycle");
    await expect(
      returnBorrowRecord(
        "30000000-0000-4000-8000-000000000003",
        {
          id: "10000000-0000-4000-8000-000000000001",
          email: "reader@example.test",
          name: "Reader",
          role: "USER",
          status: "APPROVED",
          universityCard: null,
        },
        1
      )
    ).rejects.toThrow("simulated inventory failure");

    expect(state).toEqual({ status: "BORROWED", availableCopies: 0 });
  });
});
