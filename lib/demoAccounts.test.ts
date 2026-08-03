import { describe, expect, it } from "vitest";
import { isProtectedDemoAccount } from "@/constants";

describe("isProtectedDemoAccount", () => {
  it("matches seed emails case-insensitively", () => {
    expect(isProtectedDemoAccount({ email: "Test@User.com" })).toBe(true);
    expect(isProtectedDemoAccount({ email: "test@admin.com" })).toBe(true);
  });

  it("matches reserved university IDs", () => {
    expect(isProtectedDemoAccount({ universityId: 900001 })).toBe(true);
    expect(isProtectedDemoAccount({ universityId: 900002 })).toBe(true);
  });

  it("rejects ordinary accounts", () => {
    expect(
      isProtectedDemoAccount({ email: "other@example.com", universityId: 42 }),
    ).toBe(false);
    expect(isProtectedDemoAccount({})).toBe(false);
  });
});
