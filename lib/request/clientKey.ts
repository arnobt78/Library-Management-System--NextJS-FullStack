// Parent: REQ-0026
// Normalizes proxy-supplied addresses before using them as rate-limit keys.

import { isIP } from "node:net";
import { headers } from "next/headers";

export function normalizeClientAddress(candidate: string): string | null {
  const version = isIP(candidate);
  if (version === 4) return candidate;
  if (version === 6) {
    try {
      return new URL(`http://[${candidate}]/`).hostname.slice(1, -1);
    } catch {
      return null;
    }
  }
  return null;
}

export async function getClientRateLimitKey(): Promise<string> {
  const requestHeaders = await headers();
  const candidate =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip")?.trim() ??
    "unknown";

  const normalized = normalizeClientAddress(candidate);
  return normalized ? `ip:${normalized}` : "ip:unknown";
}
