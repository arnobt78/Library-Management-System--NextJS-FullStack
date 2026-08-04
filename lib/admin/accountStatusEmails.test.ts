import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCOUNT_REJECTION_REASON,
  buildAccountStatusDecisionEmail,
} from "@/lib/admin/accountStatusEmails";

describe("account status decision emails", () => {
  it("builds approved email with reference and timestamp", () => {
    const decidedAt = new Date("2026-08-04T10:00:00.000Z");
    const { subject, html, text } = buildAccountStatusDecisionEmail({
      to: "student@example.com",
      fullName: "New Student",
      status: "APPROVED",
      userId: "user-1111-2222",
      decidedAt,
    });

    expect(subject).toContain("approved");
    expect(text).toContain("user-1111-2222");
    expect(text).toContain("2026-08-04T10:00:00.000Z");
    expect(html).toContain("Approved");
    expect(html).toContain("user-1111-2222");
  });

  it("builds declined email with default note", () => {
    const { subject, html, text } = buildAccountStatusDecisionEmail({
      to: "student@example.com",
      fullName: "New Student",
      status: "REJECTED",
      userId: "user-decline-99",
      decidedAt: "2026-08-04T10:00:00.000Z",
    });

    expect(subject).toContain("declined");
    expect(text).toContain("user-decline-99");
    expect(text).toContain(DEFAULT_ACCOUNT_REJECTION_REASON);
    expect(html).toContain("Note");
    expect(html).not.toContain("<script>");
  });
});
