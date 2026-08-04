// Parent: REQ-0025
// Pure transition rules applied after database row locks serialize concurrent calls.

type BorrowStatus = "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED";

export type TransitionDecision =
  | { allowed: true }
  | { allowed: false; error: string };

export function canApproveBorrow(
  status: BorrowStatus,
  availableCopies: number
): TransitionDecision {
  if (status !== "PENDING") {
    return { allowed: false, error: "This request has already been processed" };
  }
  if (availableCopies <= 0) {
    return { allowed: false, error: "Book is no longer available" };
  }
  return { allowed: true };
}

export function canReturnBorrow(status: BorrowStatus): TransitionDecision {
  return status === "BORROWED"
    ? { allowed: true }
    : { allowed: false, error: "This book has already been returned" };
}

/** Admin may cancel only a still-pending request (soft-reject). */
export function canCancelBorrow(status: BorrowStatus): TransitionDecision {
  return status === "PENDING"
    ? { allowed: true }
    : { allowed: false, error: "This request has already been processed" };
}
