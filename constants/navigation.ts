// Parent: REQ-0033

export interface UtilityNavigationItem {
  href: string;
  label: string;
  adminOnly?: boolean;
}

export const UTILITY_NAVIGATION_ITEMS: readonly UtilityNavigationItem[] = [
  { href: "/api-docs", label: "API Docs" },
  { href: "/performance", label: "Performance" },
  { href: "/api-status", label: "API Status" },
] as const;
