// Parent: REQ-0025; TC-0043

import { describe, expect, it } from "vitest";
import { canApproveBorrow, canReturnBorrow } from "./borrowTransitionPolicy";

describe("borrow lifecycle replay policy", () => {
  it("allows exactly one approval after concurrent callers serialize on the row lock", () => {
    let status: "PENDING" | "BORROWED" = "PENDING";
    let availableCopies = 1;

    const first = canApproveBorrow(status, availableCopies);
    expect(first.allowed).toBe(true);
    if (first.allowed) {
      status = "BORROWED";
      availableCopies -= 1;
    }

    const replay = canApproveBorrow(status, availableCopies);
    expect(replay).toEqual({
      allowed: false,
      error: "This request has already been processed",
    });
    expect(availableCopies).toBe(0);
  });

  it("allows exactly one return and therefore one inventory increment", () => {
    let status: "BORROWED" | "RETURNED" = "BORROWED";
    let availableCopies = 0;

    const first = canReturnBorrow(status);
    expect(first.allowed).toBe(true);
    if (first.allowed) {
      status = "RETURNED";
      availableCopies += 1;
    }

    expect(canReturnBorrow(status)).toEqual({
      allowed: false,
      error: "This book has already been returned",
    });
    expect(availableCopies).toBe(1);
  });

  it("never approves when inventory is exhausted", () => {
    expect(canApproveBorrow("PENDING", 0)).toEqual({
      allowed: false,
      error: "Book is no longer available",
    });
  });
});
