/**
 * Constants + ledger helpers must stay schema-valid and side-effect free to import.
 */

import { describe, expect, it } from "vitest";
import { adminRequestReasonSchema } from "@/lib/actionInputs";
import {
  ADMIN_REQUEST_DIRECT_GRANT_REASON,
  ADMIN_REQUEST_REVOKED_REASON,
} from "@/lib/admin/adminRequestConstants";

describe("admin privilege ledger constants", () => {
  it("direct-grant reason satisfies adminRequestReasonSchema", () => {
    expect(
      adminRequestReasonSchema.parse(ADMIN_REQUEST_DIRECT_GRANT_REASON),
    ).toBe(ADMIN_REQUEST_DIRECT_GRANT_REASON);
  });

  it("revoke reason satisfies adminRejectionReasonSchema length bounds", () => {
    expect(ADMIN_REQUEST_REVOKED_REASON.length).toBeGreaterThanOrEqual(10);
    expect(ADMIN_REQUEST_REVOKED_REASON.length).toBeLessThanOrEqual(1000);
  });
});
