/**
 * My Profile tab URL helpers.
 * Canonical query values: active-borrows | pending-requests | borrow-history | my-reviews.
 * Short aliases (active|pending|history|reviews) remain accepted for backward compatibility.
 * Parent: CR-0003 / REQ-0034 — "my-reviews" added for Book Review moderation.
 */

export const PROFILE_TABS = [
  "active-borrows",
  "pending-requests",
  "borrow-history",
  "my-reviews",
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export function parseProfileTab(raw: string | null | undefined): ProfileTab {
  switch (raw) {
    case "pending-requests":
    case "pending":
      return "pending-requests";
    case "borrow-history":
    case "history":
      return "borrow-history";
    case "my-reviews":
    case "reviews":
      return "my-reviews";
    case "active-borrows":
    case "active":
    default:
      return "active-borrows";
  }
}

/** Build profile path with tab query (All Books filter style). */
export function profileTabHref(tab: ProfileTab): string {
  return `/my-profile?tab=${tab}`;
}
