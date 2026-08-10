/**
 * Admin sidebar + phone-menu nav config (Stockly-style groups).
 * Single source for labels, routes, count keys, icons, prefetch.
 * Parent: admin shell Stockly chrome
 */

import type { PrefetchKind } from "@/components/PrefetchLink";

/** Lucide icon keys for admin sidebar (rendered in Sidebar — not public SVGs). */
export type AdminSidebarIconKey =
  | "home"
  | "users"
  | "book"
  | "bookmark"
  | "userPlus"
  | "shield"
  | "chart"
  | "wand"
  | "ticket"
  | "star"
  | "history";

/** Keys on AdminNavCounts used for muted sidebar pills. */
export type AdminNavCountKey =
  | "books"
  | "users"
  | "pendingAdminRequests"
  | "pendingSignUps"
  | "pendingBorrows"
  | "openTickets"
  | "pendingReviews";

export type AdminNavItemConfig = {
  route: string;
  label: string;
  icon: AdminSidebarIconKey;
  prefetchKind?: PrefetchKind;
  /** Badge count key (Admin Requests → pendingAdminRequests; Users → users). */
  countKey?: AdminNavCountKey;
  /** Page subtitle for AdminPageHeader */
  description: string;
};

export type AdminNavGroupConfig = {
  id: string;
  title: string;
  items: AdminNavItemConfig[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroupConfig[] = [
  {
    id: "circulation",
    title: "Circulation",
    items: [
      {
        route: "/admin",
        label: "Library Overview",
        icon: "home",
        prefetchKind: "admin-dashboard",
        description: "Users, books, borrows, and queue health at a glance",
      },
      {
        route: "/admin/book-requests",
        label: "Borrow Queue",
        icon: "bookmark",
        prefetchKind: "admin-book-requests",
        countKey: "pendingBorrows",
        description: "Approve, reject, and return borrow requests",
      },
      {
        route: "/admin/support-tickets",
        label: "Support Tickets",
        icon: "ticket",
        prefetchKind: "admin-tickets",
        countKey: "openTickets",
        description: "Open and in-progress requester tickets",
      },
      {
        route: "/admin/book-reviews",
        label: "Review Moderation",
        icon: "star",
        prefetchKind: "admin-reviews",
        countKey: "pendingReviews",
        description: "Approve or reject pending book reviews",
      },
    ],
  },
  {
    id: "catalog-people",
    title: "Catalog & people",
    items: [
      {
        route: "/admin/books",
        label: "Book Catalog",
        icon: "book",
        prefetchKind: "admin-books",
        countKey: "books",
        description: "Create, edit, and manage library inventory",
      },
      {
        route: "/admin/users",
        label: "User Management",
        icon: "users",
        prefetchKind: "admin-users",
        countKey: "users",
        description: "Directory of library accounts and roles",
      },
      {
        route: "/admin/account-requests",
        label: "Registration Queue",
        icon: "userPlus",
        prefetchKind: "admin-account-requests",
        countKey: "pendingSignUps",
        description: "Approve or reject new library sign-ups",
      },
      {
        route: "/admin/admin-requests",
        label: "Admin Requests",
        icon: "shield",
        prefetchKind: "admin-admin-requests",
        countKey: "pendingAdminRequests",
        description: "Review make-admin privilege applications",
      },
    ],
  },
  {
    id: "insights-ops",
    title: "Insights & ops",
    items: [
      {
        route: "/admin/business-insights",
        label: "Business Insights",
        icon: "chart",
        description: "Circulation analytics and library trends",
      },
      {
        route: "/admin/activity-history",
        label: "Activity History",
        icon: "history",
        description: "Recent admin actions across the library",
      },
      {
        route: "/admin/automation",
        label: "Automation",
        icon: "wand",
        description: "Reminders, bulk jobs, and data export",
      },
    ],
  },
];

/** Flat list for legacy consumers / dropdowns. */
export const ADMIN_NAV_ITEMS: AdminNavItemConfig[] =
  ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export function getAdminNavItemByRoute(
  route: string,
): AdminNavItemConfig | undefined {
  return ADMIN_NAV_ITEMS.find((item) => item.route === route);
}

/** Resolve badge for a nav item (countKey only — no cross-route stealing). */
export function resolveNavBadgeCount(
  item: AdminNavItemConfig,
  counts: Record<AdminNavCountKey, number>,
): number {
  if (!item.countKey) return 0;
  return counts[item.countKey] ?? 0;
}
