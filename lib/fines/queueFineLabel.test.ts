import { describe, expect, it } from "vitest";
import { borrowFineKpiHint, borrowQueueFineLabel } from "./queueFineLabel";

describe("borrowQueueFineLabel", () => {
  it("labels WAIVED instead of em dash", () => {
    expect(
      borrowQueueFineLabel({ fineStatus: "WAIVED", amount: 0 }),
    ).toEqual({ display: "Waived", tone: "muted" });
  });

  it("keeps NONE $0 as em dash", () => {
    expect(
      borrowQueueFineLabel({ fineStatus: "NONE", amount: 0 }),
    ).toEqual({ display: "—", tone: "muted" });
  });

  it("shows paid history dollars", () => {
    expect(
      borrowQueueFineLabel({ fineStatus: "PAID", amount: 5 }),
    ).toEqual({ display: "$5.00", tone: "plain" });
  });
});

describe("borrowFineKpiHint", () => {
  it("does not say Accrued when waived", () => {
    expect(
      borrowFineKpiHint({ fineStatus: "WAIVED", overdueDays: 14 }),
    ).toBe("Waived · 14 days overdue");
  });

  it("keeps accrued copy for open overdue", () => {
    expect(
      borrowFineKpiHint({ fineStatus: "STAMPED", overdueDays: 14 }),
    ).toBe("Accrued balance · 14 days overdue");
  });
});
