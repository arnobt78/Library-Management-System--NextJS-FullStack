// Parent: REQ-0033
// Utility links shown in ProfileDropdown + MobileMenu (icons render beside labels).

import type { LucideIcon } from "lucide-react";
import { FileText, Activity } from "lucide-react";

export interface UtilityNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const UTILITY_NAVIGATION_ITEMS: readonly UtilityNavigationItem[] = [
  { href: "/api-docs", label: "API Docs", icon: FileText },
  { href: "/api-status", label: "API Status", icon: Activity },
] as const;
