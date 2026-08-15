/**
 * Advisory User 360 next-actions from deterministic aggregates only.
 * Never mutates eligibility, fines, or queue priority (REQ-0031).
 */

export type UserNextAction = {
  id: string;
  label: string;
  reason: string;
};

export type UserNextActionInput = {
  overdue: number;
  outstandingFine: number;
  pending: number;
  waitingHolds: number;
  readyHolds: number;
};

export function buildUserNextActions(
  input: UserNextActionInput,
): UserNextAction[] {
  const actions: UserNextAction[] = [];

  if (input.overdue > 0) {
    actions.push({
      id: "return-overdue",
      label: "Return overdue books",
      reason: `${input.overdue} loan${input.overdue === 1 ? "" : "s"} past due`,
    });
  }
  if (input.outstandingFine > 0) {
    actions.push({
      id: "settle-fine",
      label: "Review outstanding fine",
      reason: `$${input.outstandingFine.toFixed(2)} outstanding (advisory)`,
    });
  }
  if (input.pending > 0) {
    actions.push({
      id: "await-approval",
      label: "Await borrow approval",
      reason: `${input.pending} pending request${input.pending === 1 ? "" : "s"}`,
    });
  }
  if (input.readyHolds > 0) {
    actions.push({
      id: "pickup-hold",
      label: "Pickup ready hold",
      reason: `${input.readyHolds} hold${input.readyHolds === 1 ? "" : "s"} ready`,
    });
  } else if (input.waitingHolds > 0) {
    actions.push({
      id: "waiting-hold",
      label: "Waiting on hold queue",
      reason: `${input.waitingHolds} active waitlist hold${input.waitingHolds === 1 ? "" : "s"}`,
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "healthy",
      label: "No urgent actions",
      reason: "No overdue loans, fines, or open holds for this user",
    });
  }

  return actions;
}
