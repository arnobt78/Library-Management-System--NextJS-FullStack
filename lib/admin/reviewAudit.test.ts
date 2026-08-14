/**
 * Unit: review audit label mapper (no DB).
 * Parent: review detail KPI cleanup + Activity FIFO-25
 */
import { describe, expect, it } from "vitest";
import { reviewAuditLabel } from "@/lib/admin/reviewAuditLabel";

describe("reviewAuditLabel", () => {
  it("maps CREATE / DELETE", () => {
    expect(reviewAuditLabel("CREATE")).toBe("Review created");
    expect(reviewAuditLabel("DELETE")).toBe("Review deleted");
  });

  it("maps moderation status from details", () => {
    expect(reviewAuditLabel("UPDATE", { status: "APPROVED" })).toBe(
      "Status → Approved",
    );
    expect(reviewAuditLabel("UPDATE", { status: "REJECTED" })).toBe(
      "Status → Rejected",
    );
    expect(reviewAuditLabel("UPDATE", { status: "PENDING" })).toBe(
      "Status → Pending",
    );
  });

  it("falls back for plain UPDATE", () => {
    expect(reviewAuditLabel("UPDATE")).toBe("Review updated");
  });
});
