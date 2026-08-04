import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCOUNT_REJECTION_REASON,
  buildAccountStatusDecisionEmail,
} from "@/lib/admin/accountStatusEmails";

describe("account status decision emails", () => {
  it("builds approved email with unique subject, actor text, and no images", () => {
    const decidedAt = new Date("2026-08-04T10:00:00.000Z");
    const { subject, html, text } = buildAccountStatusDecisionEmail({
      to: "student@example.com",
      fullName: "New Student",
      status: "APPROVED",
      userId: "user-1111-2222",
      decidedAt,
      decidedBy: { fullName: "Lib Admin", email: "admin@example.com" },
    });

    expect(subject).toMatch(
      /^BookWise: Account approved · 2026-08-04T10:00:00\.000Z · [0-9a-f]{6}$/,
    );
    expect(text).toContain("user-1111-2222");
    expect(text).toContain("2026-08-04T10:00:00.000Z");
    expect(text).toContain("Approved by: Lib Admin (admin@example.com)");
    expect(html).toContain("Approved");
    expect(html).toContain("Lib Admin (admin@example.com)");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script>");
  });

  it("builds declined email with unique subject and default note", () => {
    const { subject, html, text } = buildAccountStatusDecisionEmail({
      to: "student@example.com",
      fullName: "New Student",
      status: "REJECTED",
      userId: "user-decline-99",
      decidedAt: "2026-08-04T10:00:00.000Z",
      decidedBy: { fullName: "Lib Admin", email: "admin@example.com" },
    });

    expect(subject).toMatch(
      /^BookWise: Account registration declined · 2026-08-04T10:00:00\.000Z · [0-9a-f]{6}$/,
    );
    expect(text).toContain("user-decline-99");
    expect(text).toContain(DEFAULT_ACCOUNT_REJECTION_REASON);
    expect(text).toContain("Declined by: Lib Admin (admin@example.com)");
    expect(html).toContain("Note");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script>");
  });
});
