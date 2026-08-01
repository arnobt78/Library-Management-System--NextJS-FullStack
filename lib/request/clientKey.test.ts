// Parent: REQ-0026; TC-0053
import { describe, expect, it } from "vitest";
import { normalizeClientAddress } from "./clientKey";

describe("client rate-limit key normalization", () => {
  it("normalizes equivalent IPv6 forms to one value", () => {
    expect(normalizeClientAddress("2001:0db8:0:0:0:0:0:1")).toBe("2001:db8::1");
    expect(normalizeClientAddress("2001:db8::1")).toBe("2001:db8::1");
  });

  it("preserves valid IPv4 and rejects arbitrary identifiers", () => {
    expect(normalizeClientAddress("192.0.2.1")).toBe("192.0.2.1");
    expect(normalizeClientAddress("user@example.test")).toBeNull();
  });
});
