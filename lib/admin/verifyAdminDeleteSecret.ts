/**
 * Verifies ADMIN_DELETE_SECRET with constant-time comparison.
 * Used by hard-delete book actions and the one-off cleanup script.
 */

import { timingSafeEqual } from "crypto";

/**
 * Returns true only when the provided secret matches process.env.ADMIN_DELETE_SECRET.
 * Fails closed if the env var is missing/empty or lengths differ.
 */
export function verifyAdminDeleteSecret(provided: string | undefined | null): {
  ok: boolean;
  message?: string;
} {
  const expected = process.env.ADMIN_DELETE_SECRET;

  if (!expected || expected.length === 0) {
    return {
      ok: false,
      message:
        "ADMIN_DELETE_SECRET is not configured on the server. Hard delete is disabled.",
    };
  }

  if (!provided || typeof provided !== "string") {
    return { ok: false, message: "Delete secret is required." };
  }

  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) {
      return { ok: false, message: "Invalid delete secret." };
    }
    if (!timingSafeEqual(a, b)) {
      return { ok: false, message: "Invalid delete secret." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Invalid delete secret." };
  }
}
