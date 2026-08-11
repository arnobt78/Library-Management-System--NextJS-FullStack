import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_REJECTION_REASON,
  DEFAULT_ADMIN_REQUEST_REASON,
} from "@/lib/admin/adminRequestConstants";
import { buildAdminRequestDecisionEmail } from "@/lib/admin/adminRequestEmails";
import { adminRequestReasonSchema } from "@/lib/actionInputs";

describe("admin request decision emails", () => {
  it("exports a friendly default decline reason within schema bounds", () => {
    expect(DEFAULT_ADMIN_REJECTION_REASON.trim().length).toBeGreaterThanOrEqual(
      10,
    );
    expect(DEFAULT_ADMIN_REJECTION_REASON.length).toBeLessThanOrEqual(1000);
  });

  it("exports a friendly default request reason within schema bounds", () => {
    expect(adminRequestReasonSchema.parse(DEFAULT_ADMIN_REQUEST_REASON)).toBe(
      DEFAULT_ADMIN_REQUEST_REASON,
    );
  });

  it("builds approved email with unique subject and actor text", () => {
    const reviewedAt = new Date("2026-08-04T00:33:00.000Z");
    const { subject, html, text } = buildAdminRequestDecisionEmail({
      to: "user@example.com",
      fullName: "Test User",
      status: "APPROVED",
      requestId: "req-1111-2222",
      reviewedAt,
      decidedBy: { fullName: "Lib Admin", email: "admin@example.com" },
    });

    expect(subject).toMatch(
      /^BookWise: Admin request approved · 2026-08-04T00:33:00\.000Z · [0-9a-f]{6}$/,
    );
    expect(text).toContain("req-1111-2222");
    expect(text).toContain("2026-08-04T00:33:00.000Z");
    expect(text).toContain("Approved by: Lib Admin (admin@example.com)");
    expect(html).toContain("req-1111-2222");
    expect(html).toContain("Approved");
    expect(html).not.toContain("<img");
  });

  it("builds declined email with reviewer note and unique subject", () => {
    const { subject, html, text } = buildAdminRequestDecisionEmail({
      to: "user@example.com",
      fullName: "Test User",
      status: "REJECTED",
      requestId: "req-decline-99",
      reviewedAt: "2026-08-04T00:33:00.000Z",
      decidedBy: { fullName: "Lib Admin", email: "admin@example.com" },
      rejectionReason: DEFAULT_ADMIN_REJECTION_REASON,
    });

    expect(subject).toMatch(
      /^BookWise: Admin request declined · 2026-08-04T00:33:00\.000Z · [0-9a-f]{6}$/,
    );
    expect(text).toContain("req-decline-99");
    expect(text).toContain(DEFAULT_ADMIN_REJECTION_REASON);
    expect(text).toContain("Declined by: Lib Admin (admin@example.com)");
    expect(html).toContain("Note from reviewer");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script>");
  });
});
