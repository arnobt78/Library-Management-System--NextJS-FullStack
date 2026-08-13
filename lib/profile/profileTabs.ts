/**
 * My Profile tab URL helpers.
 * Canonical: active-borrows | pending-requests | holds | borrow-history | my-reviews.
 * Short aliases remain accepted for backward compatibility.
 */

export const PROFILE_TABS = [
  "active-borrows",
  "pending-requests",
  "holds",
  "borrow-history",
  "my-reviews",
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export function parseProfileTab(raw: string | null | undefined): ProfileTab {
  switch (raw) {
    case "pending-requests":
    case "pending":
      return "pending-requests";
    case "holds":
    case "reservations":
      return "holds";
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
