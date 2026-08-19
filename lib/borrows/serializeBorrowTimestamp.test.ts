import { describe, expect, it } from "vitest";
import {
  serializeBorrowTimestamp,
  toStableBorrowDate,
} from "./serializeBorrowTimestamp";

describe("serializeBorrowTimestamp", () => {
  it("promotes YYYY-MM-DD to UTC noon", () => {
    expect(serializeBorrowTimestamp("2026-08-05")).toBe(
      "2026-08-05T12:00:00.000Z",
    );
  });

  it("keeps full ISO clocks", () => {
    expect(serializeBorrowTimestamp("2026-08-05T15:18:00.000Z")).toBe(
      "2026-08-05T15:18:00.000Z",
    );
  });

  it("serializes Date objects", () => {
    expect(
      serializeBorrowTimestamp(new Date("2026-08-05T12:00:00.000Z")),
    ).toBe("2026-08-05T12:00:00.000Z");
  });

  it("returns null for empty values", () => {
    expect(serializeBorrowTimestamp(null)).toBeNull();
    expect(serializeBorrowTimestamp("")).toBeNull();
  });
});

describe("toStableBorrowDate", () => {
  it("keeps approvedAt as a Date clock for the profile RQ map", () => {
    const approvedAt = "2026-08-19T11:30:00.000Z";
    expect(toStableBorrowDate(approvedAt)?.toISOString()).toBe(approvedAt);
    expect(toStableBorrowDate(null)).toBeNull();
  });
});
