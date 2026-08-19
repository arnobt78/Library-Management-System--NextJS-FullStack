import { describe, expect, it } from "vitest";
import { isImmutableFineStatus } from "./status";

describe("isImmutableFineStatus", () => {
  it("treats WAIVED and PAID as frozen forever (automation must not restamp)", () => {
    expect(isImmutableFineStatus("WAIVED")).toBe(true);
    expect(isImmutableFineStatus("PAID")).toBe(true);
  });

  it("lets open overdue statuses stamp or accrue", () => {
    expect(isImmutableFineStatus("NONE")).toBe(false);
    expect(isImmutableFineStatus("ACCRUING")).toBe(false);
    expect(isImmutableFineStatus("STAMPED")).toBe(false);
    expect(isImmutableFineStatus(null)).toBe(false);
  });
});
