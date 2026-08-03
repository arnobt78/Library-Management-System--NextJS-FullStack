/**
 * Robohash URL for empty/broken university_card avatars.
 * Seeded by email so the same user always gets the same robot.
 */

export function robohashUrl(email: string, size = 80): string {
  const seed = encodeURIComponent(email.trim().toLowerCase());
  const px = Math.max(40, Math.min(size, 256));
  return `https://robohash.org/${seed}?set=set1&size=${px}x${px}`;
}
