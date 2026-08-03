/**
 * My Profile tab URL helpers.
 * Canonical query values: active-borrows | pending-requests | borrow-history.
 * Short aliases (active|pending|history) remain accepted for backward compatibility.
 */

export const PROFILE_TABS = [
  "active-borrows",
  "pending-requests",
  "borrow-history",
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
