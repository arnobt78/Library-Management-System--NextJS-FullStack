import { describe, expect, it } from "vitest";
import { mapSsrBorrowRecord } from "./mapSsrBorrowRecord";

describe("mapSsrBorrowRecord", () => {
  it("keeps approvedAt, cancelledAt, and renewedAt ISO clocks", () => {
    const mapped = mapSsrBorrowRecord({
      id: "b-1",
      userId: "u-1",
      bookId: "bk-1",
      borrowDate: new Date("2026-08-01T10:30:00.000Z"),
      dueDate: new Date("2026-08-08T12:00:00.000Z"),
      returnDate: null,
      approvedAt: new Date("2026-08-01T11:30:00.000Z"),
      cancelledAt: new Date("2026-08-02T10:30:00.000Z"),
      renewedAt: new Date("2026-08-05T09:30:00.000Z"),
      status: "BORROWED",
      borrowedBy: "test@user.com",
      returnedBy: null,
      fineAmount: "0.00",
      notes: null,
      renewalCount: 1,
      lastReminderSent: null,
      updatedAt: new Date("2026-08-05T09:30:00.000Z"),
      updatedBy: "test@user.com",
      createdAt: new Date("2026-08-01T10:30:00.000Z"),
    });

    expect(mapped.approvedAt).toBe("2026-08-01T11:30:00.000Z");
    expect(mapped.cancelledAt).toBe("2026-08-02T10:30:00.000Z");
    expect(mapped.renewedAt).toBe("2026-08-05T09:30:00.000Z");
  });
});
