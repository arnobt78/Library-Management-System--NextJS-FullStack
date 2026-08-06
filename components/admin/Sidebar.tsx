"use client";

/**
 * Admin sidebar — Stockly-style grouped nav, muted counters, no logo/user rows.
 * PrefetchLink warms lists; useAdminNavCounts + SSR seed for densify (no cold flash).
 * Parent: admin shell Stockly chrome
 */

import {
  ADMIN_NAV_GROUPS,
  resolveNavBadgeCount,
  type AdminSidebarIconKey,
} from "@/lib/navigation/admin-nav-config";
import PrefetchLink from "@/components/PrefetchLink";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useAdminNavCounts } from "@/hooks/useQueries";
import type { AdminNavCounts } from "@/lib/admin/adminNavCountTypes";
import { EMPTY_ADMIN_NAV_COUNTS } from "@/lib/admin/adminNavCountTypes";
import {
  BarChart3,
  BookOpen,
  Bookmark,
  History,
  Home,
  type LucideIcon,
  Star,
  Ticket,
  UserPlus,
  Users,
  Wand2,
} from "lucide-react";

const ADMIN_SIDEBAR_ICONS: Record<AdminSidebarIconKey, LucideIcon> = {
  home: Home,
  users: Users,
  book: BookOpen,
  bookmark: Bookmark,
  userPlus: UserPlus,
  chart: BarChart3,
  wand: Wand2,
  ticket: Ticket,
  star: Star,
  history: History,
};

function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

const Sidebar = ({
  initialNavCounts,
}: {
  /** SSR seed for muted sidebar counters (densify-safe). */
  initialNavCounts?: AdminNavCounts;
}) => {
  const pathname = usePathname();
  const { data: navCounts } = useAdminNavCounts(
    initialNavCounts ?? EMPTY_ADMIN_NAV_COUNTS,
  );
  const counts = navCounts ?? initialNavCounts ?? EMPTY_ADMIN_NAV_COUNTS;

  return (
    <aside className="admin-sidebar">
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.id} className="flex flex-col gap-1">
            <p className="hidden px-2 pt-2 text-xs font-normal uppercase tracking-wider text-muted-foreground sm:block">
              {group.title}
            </p>
            {group.items.map((item) => {
              const isSelected =
                (item.route !== "/admin" &&
                  pathname.includes(item.route) &&
                  item.route.length > 1) ||
                pathname === item.route;

              const badgeCount = resolveNavBadgeCount(item, counts);
              const Icon = ADMIN_SIDEBAR_ICONS[item.icon];

              return (
                <PrefetchLink
                  href={item.route}
                  key={item.route}
                  prefetchKind={item.prefetchKind}
                >
                  <div
                    className={cn(
                      "relative flex w-full flex-row items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:justify-start sm:pl-8",
                      isSelected
                        ? "bg-primary-admin/10 text-primary-admin"
                        : "text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="hidden min-w-0 flex-1 truncate sm:block">
                      {item.label}
                    </span>
                    {badgeCount > 0 ? (
                      <span
                        className={cn(
                          "admin-sidebar-badge",
                          isSelected && "admin-sidebar-badge--selected",
                        )}
                        aria-label={`${badgeCount} for ${item.label}`}
                      >
                        {formatBadgeCount(badgeCount)}
                      </span>
                    ) : null}
                  </div>
                </PrefetchLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
