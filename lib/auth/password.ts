/**
 * Shared password hashing for sign-up and seed scripts.
 * Format matches NextAuth credentials verify in auth.ts: "base64Salt:base64Hash"
 * (salted SHA-256 — same algorithm as before; not a security change).
 */

import { createHash, randomBytes } from "node:crypto";

/**
 * Hash a plaintext password with a fresh 16-byte salt.
 * @returns `salt:hash` where both parts are base64-encoded
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const passwordBytes = new TextEncoder().encode(plain);
  const hashBuffer = createHash("sha256")
    .update(passwordBytes)
    .update(salt)
    .digest();

  return `${Buffer.from(salt).toString("base64")}:${Buffer.from(hashBuffer).toString("base64")}`;
}
