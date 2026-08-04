import { describe, expect, it } from "vitest";
import { buildWelcomeSignupEmail } from "@/lib/email/welcomeSignup";

describe("welcome signup emails", () => {
  it("builds unique subject and pending + make-admin copy without images", () => {
    const { subject, html, text } = buildWelcomeSignupEmail({
      to: "student@example.com",
      fullName: "New Student",
    });

    expect(subject).toMatch(
      /^BookWise: Welcome to BookWise · .+Z · [0-9a-f]{6}$/,
    );
    expect(text).toContain("pending librarian approval");
    expect(text).toContain("make-admin");
    expect(html).toContain("Welcome to BookWise Library");
    expect(html).toContain("pending librarian approval");
    expect(html).toContain("administrator access");
    expect(html).not.toContain("<img");
  });
});
