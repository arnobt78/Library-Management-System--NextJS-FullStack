/**
 * bookAuditLabel — catalog Activity FIFO labels.
 * Parent: Admin Book Detail FIFO-25 Activity
 */

import { describe, expect, it } from "vitest";
import { bookAuditLabel } from "@/lib/admin/bookAuditLabel";

describe("bookAuditLabel", () => {
  it("maps CREATE / DELETE / UPDATE", () => {
    expect(bookAuditLabel("CREATE")).toBe("Book created");
    expect(bookAuditLabel("DELETE")).toBe("Book deleted");
    expect(bookAuditLabel("UPDATE")).toBe("Book updated");
  });

  it("maps ACTIVE / INACTIVE status details", () => {
    expect(bookAuditLabel("UPDATE", { status: "ACTIVE" })).toBe(
      "Status → Active",
    );
    expect(bookAuditLabel("UPDATE", { status: "INACTIVE" })).toBe(
      "Status → Inactive",
    );
  });
});
