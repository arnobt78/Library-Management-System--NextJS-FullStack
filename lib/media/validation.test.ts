// Parent: REQ-0026; TC-0054
import { describe, expect, it } from "vitest";
import { matchesMediaSignature } from "./validation";

describe("media signature validation", () => {
  it("accepts supported file signatures", () => {
    expect(matchesMediaSignature("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff]))).toBe(true);
    expect(matchesMediaSignature("image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(matchesMediaSignature("video/mp4", Uint8Array.from([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70]))).toBe(true);
  });

  it("rejects spoofed MIME labels and unsupported content", () => {
    expect(matchesMediaSignature("image/png", Uint8Array.from([0xff, 0xd8, 0xff]))).toBe(false);
    expect(matchesMediaSignature("text/plain", Uint8Array.from([1, 2, 3]))).toBe(false);
  });
});
