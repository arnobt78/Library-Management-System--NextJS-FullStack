/** Borrow Queue Fine cell — WAIVED is a label, $0 NONE stays em dash. */

export type QueueFineLabel = {
  display: string;
  tone: "muted" | "overdue" | "plain";
};

export function borrowQueueFineLabel(args: {
  fineStatus?: string | null;
  amount: number;
  overdueDays?: number;
}): QueueFineLabel {
  if (args.fineStatus === "WAIVED") {
    return { display: "Waived", tone: "muted" };
  }
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    return { display: "—", tone: "muted" };
  }
  return {
    display: `$${args.amount.toFixed(2)}`,
    tone: (args.overdueDays ?? 0) > 0 ? "overdue" : "plain",
  };
}

export function borrowFineKpiHint(args: {
  fineStatus?: string | null;
  overdueDays: number;
}): string {
  const days = args.overdueDays;
  const dayLabel = `${days} day${days === 1 ? "" : "s"} overdue`;
  if (args.fineStatus === "WAIVED") {
    return days > 0 ? `Waived · ${dayLabel}` : "Waived";
  }
  if (args.fineStatus === "PAID") {
    return "Paid";
  }
  return days > 0
    ? `Accrued balance · ${dayLabel}`
    : "Accrued balance · No overdue days";
}
