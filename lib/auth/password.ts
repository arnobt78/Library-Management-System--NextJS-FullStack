// Parent: REQ-0026
// Versioned memory-hard password storage with legacy SHA-256 verification for atomic rehash-on-login.

import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_PREFIX = "$scrypt$";
const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 3;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function deriveScryptKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

function decodeBase64(value: string): Buffer | null {
  if (!value || !BASE64_PATTERN.test(value)) return null;
  try {
    return Buffer.from(value, "base64");
  } catch {
    return null;
  }
}

/** Creates the only password format allowed for new or upgraded credentials. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await deriveScryptKey(password, salt);
  return `${SCRYPT_PREFIX}ln=15,r=8,p=3$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyScryptPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parts = encoded.split("$");
  if (
    parts.length !== 5 ||
    parts[1] !== "scrypt" ||
    parts[2] !== "ln=15,r=8,p=3"
  ) {
    return false;
  }

  const salt = decodeBase64(parts[3]);
  const expected = decodeBase64(parts[4]);
  if (!salt || salt.length !== 16 || !expected || expected.length !== SCRYPT_KEY_LENGTH) {
    return false;
  }

  const actual = await deriveScryptKey(password, salt);
  return timingSafeEqual(actual, expected);
}

function verifyLegacyPassword(password: string, encoded: string): boolean {
  const [saltValue, hashValue, extra] = encoded.split(":");
  if (extra !== undefined) return false;

  const salt = decodeBase64(saltValue);
  const expected = decodeBase64(hashValue);
  if (!salt || salt.length !== 16 || !expected || expected.length !== 32) {
    return false;
  }

  const actual = createHash("sha256").update(password).update(salt).digest();
  return timingSafeEqual(actual, expected);
}

export function needsPasswordRehash(encoded: string): boolean {
  return !encoded.startsWith(SCRYPT_PREFIX);
}

/** Malformed encodings fail closed and never throw into the authentication response. */
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  try {
    return encoded.startsWith(SCRYPT_PREFIX)
      ? await verifyScryptPassword(password, encoded)
      : verifyLegacyPassword(password, encoded);
  } catch {
    return false;
  }
}
