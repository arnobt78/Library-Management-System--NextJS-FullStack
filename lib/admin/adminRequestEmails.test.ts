import { describe, expect, it } from "vitest";
import { DEFAULT_ADMIN_REJECTION_REASON } from "@/lib/admin/adminRequestConstants";
import { buildAdminRequestDecisionEmail } from "@/lib/admin/adminRequestEmails";

describe("admin request decision emails", () => {
  it("exports a friendly default decline reason within schema bounds", () => {
    expect(DEFAULT_ADMIN_REJECTION_REASON.trim().length).toBeGreaterThanOrEqual(
      10,
    );
    expect(DEFAULT_ADMIN_REJECTION_REASON.length).toBeLessThanOrEqual(1000);
  });

  it("builds approved email with reference and timestamp", () => {
    const reviewedAt = new Date("2026-08-04T00:33:00.000Z");
    const { subject, html, text } = buildAdminRequestDecisionEmail({
      to: "user@example.com",
      fullName: "Test User",
      status: "APPROVED",
      requestId: "req-1111-2222",
      reviewedAt,
    });

    expect(subject).toContain("approved");
    expect(text).toContain("req-1111-2222");
    expect(text).toContain("2026-08-04T00:33:00.000Z");
    expect(html).toContain("req-1111-2222");
    expect(html).toContain("Approved");
  });

  it("builds declined email with reviewer note", () => {
    const { subject, html, text } = buildAdminRequestDecisionEmail({
      to: "user@example.com",
      fullName: "Test User",
      status: "REJECTED",
      requestId: "req-decline-99",
      reviewedAt: "2026-08-04T00:33:00.000Z",
      rejectionReason: DEFAULT_ADMIN_REJECTION_REASON,
    });

    expect(subject).toContain("declined");
    expect(text).toContain("req-decline-99");
    expect(text).toContain(DEFAULT_ADMIN_REJECTION_REASON);
    expect(html).toContain("Note from reviewer");
    expect(html).not.toContain("<script>");
  });
});
