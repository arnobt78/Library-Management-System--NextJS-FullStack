/**
 * Client-side UUID list parse for Automation bulk paste (comma / whitespace / newline).
 * Server still re-validates via parseEntityIds.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseBulkIdInput(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(parts.filter((p) => UUID_RE.test(p)))];
}
