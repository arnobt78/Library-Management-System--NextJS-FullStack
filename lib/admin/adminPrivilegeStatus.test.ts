/**
 * Unit: deriveAdminPrivilegeStatus — role wins over ledger.
 */

import { describe, expect, it } from "vitest";
import { deriveAdminPrivilegeStatus } from "@/lib/admin/adminPrivilegeStatus";

describe("deriveAdminPrivilegeStatus", () => {
  it("returns APPROVED when role is ADMIN", () => {
    expect(
      deriveAdminPrivilegeStatus({
        role: "ADMIN",
        pendingAdminRequestId: "req-1",
        latestAdminRequestStatus: "REJECTED",
      }),
    ).toBe("APPROVED");
  });

  it("returns PENDING when pending id set", () => {
    expect(
      deriveAdminPrivilegeStatus({
        role: "USER",
        pendingAdminRequestId: "req-1",
        latestAdminRequestStatus: "REJECTED",
      }),
    ).toBe("PENDING");
  });

  it("returns latest ledger status when no pending", () => {
    expect(
      deriveAdminPrivilegeStatus({
        role: "USER",
        pendingAdminRequestId: null,
        latestAdminRequestStatus: "REJECTED",
      }),
    ).toBe("REJECTED");
  });

  it("returns NOT_REQUESTED when empty", () => {
    expect(
      deriveAdminPrivilegeStatus({
        role: "USER",
        pendingAdminRequestId: null,
        latestAdminRequestStatus: null,
      }),
    ).toBe("NOT_REQUESTED");
  });
});
