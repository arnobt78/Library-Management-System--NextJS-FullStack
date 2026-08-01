// Parent: REQ-0026

import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} from "./password";

function legacyHash(password: string): string {
  const salt = randomBytes(16);
  const hash = createHash("sha256").update(password).update(salt).digest();
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

describe("password storage", () => {
  it("writes and verifies the approved versioned scrypt format", async () => {
    const encoded = await hashPassword("correct horse battery staple");

    expect(encoded).toMatch(/^\$scrypt\$ln=15,r=8,p=3\$/);
    expect(needsPasswordRehash(encoded)).toBe(false);
    await expect(
      verifyPassword("correct horse battery staple", encoded),
    ).resolves.toBe(true);
    await expect(verifyPassword("wrong", encoded)).resolves.toBe(false);
  });

  it("accepts valid legacy credentials only for rehash migration", async () => {
    const encoded = legacyHash("legacy-password");

    expect(needsPasswordRehash(encoded)).toBe(true);
    await expect(verifyPassword("legacy-password", encoded)).resolves.toBe(true);
    await expect(verifyPassword("wrong", encoded)).resolves.toBe(false);
  });

  it.each([
    "",
    "not-base64:not-base64",
    "$scrypt$ln=14,r=8,p=3$Zm9v$YmFy",
    "$scrypt$ln=15,r=8,p=3$Zm9v$YmFy",
    "Zm9v:YmFy:extra",
  ])("fails closed for malformed encoding %j", async (encoded) => {
    await expect(verifyPassword("password", encoded)).resolves.toBe(false);
  });
});
