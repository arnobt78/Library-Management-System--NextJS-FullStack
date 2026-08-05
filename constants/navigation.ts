// Parent: REQ-0033, CR-0003 / REQ-0034
// Utility links shown in ProfileDropdown + MobileMenu (icons render beside labels).

import type { LucideIcon } from "lucide-react";
import { FileText, Activity, Ticket } from "lucide-react";

export interface UtilityNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

// Personal-hub links (same route for every role, including admin-as-user).
export const UTILITY_NAVIGATION_ITEMS: readonly UtilityNavigationItem[] = [
  { href: "/support-tickets", label: "My Support Tickets", icon: Ticket },
  { href: "/api-docs", label: "API Docs", icon: FileText },
  { href: "/api-status", label: "API Status", icon: Activity },
] as const;
