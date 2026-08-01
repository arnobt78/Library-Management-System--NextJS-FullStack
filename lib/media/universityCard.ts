/**
 * Resolve users.university_card for display.
 *
 * Production sign-up stores ImageKit URLs or relative ImageKit paths.
 * Test seed stores local public assets under /images/... (and optionally /icons/...).
 * Without this helper, local paths were incorrectly sent to ImageKit.
 */

export type ResolvedUniversityCard =
  | { kind: "local"; src: string }
  | { kind: "remote"; src: string }
  | { kind: "imagekit"; path: string }
  | { kind: "empty" };

/**
 * Classify a universityCard / avatar string for the correct image renderer.
 */
export function resolveUniversityCard(
  value: string | null | undefined
): ResolvedUniversityCard {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { kind: "empty" };
  }

  // Local Next.js public assets (seeded test profiles, static icons)
  if (trimmed.startsWith("/images/") || trimmed.startsWith("/icons/")) {
    return { kind: "local", src: trimmed };
  }

  // Absolute remote URL (often full ImageKit CDN URL from FileUpload)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { kind: "remote", src: trimmed };
  }

  // Relative ImageKit file path (legacy / upload path without host)
  const path = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  return { kind: "imagekit", path };
}
