/**
 * Robohash URL for empty/broken university_card avatars.
 * Seeded by a stable per-user identifier (email, or a non-PII id such as
 * userId on public payloads that must not expose real email addresses) so
 * the same user always gets the same robot.
 */

export function robohashUrl(email: string, size = 80): string {
  const seed = encodeURIComponent(email.trim().toLowerCase());
  const px = Math.max(40, Math.min(size, 256));
  return `https://robohash.org/${seed}?set=set1&size=${px}x${px}`;
}
