"use client";

/**
 * Admin sidebar nav.
 * All Users shows a live PENDING admin-request count (SSR seed + RQ invalidation).
 * Nav icons are Lucide (constants icon keys) — brand logo stays a public SVG.
 */

import { adminSideBarLinks, type AdminSidebarIconKey } from "@/constants";
import Link from "next/link";
import { cn, getInitials } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Session } from "next-auth";
import { usePendingAdminRequests } from "@/hooks/useQueries";
import type { AdminRequest } from "@/lib/services/users";
import {
  BarChart3,
  BookOpen,
  Bookmark,
  Home,
  type LucideIcon,
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
};

const Sidebar = ({
  session,
  initialPendingAdminRequests = [],
}: {
  session: Session;
  /** SSR seed for pending make-admin requests (All Users badge) */
  initialPendingAdminRequests?: AdminRequest[];
}) => {
  const pathname = usePathname();
  const { data: pendingAdminRequests } = usePendingAdminRequests(
    initialPendingAdminRequests,
  );
  const pendingAdminCount = (
    pendingAdminRequests ?? initialPendingAdminRequests
  ).length;

  return (
    <div className="admin-sidebar">
      <div>
        <Link href="/" className="logo">
          <img
            src="/icons/admin/logo.svg"
            alt="logo"
            height={37}
            width={37}
            className="size-7 sm:size-[37px]"
          />
          <h1>BookWise</h1>
        </Link>

        <div className="my-2 flex flex-col gap-1.5 sm:gap-2">
          {adminSideBarLinks.map((link) => {
            const isSelected =
              (link.route !== "/admin" &&
                pathname.includes(link.route) &&
                link.route.length > 1) ||
              pathname === link.route;
            const showAdminBadge =
              link.route === "/admin/users" && pendingAdminCount > 0;
            const Icon = ADMIN_SIDEBAR_ICONS[link.icon];

            return (
              <Link href={link.route} key={link.route}>
                <div
                  className={cn(
                    "link",
                    isSelected && "bg-primary-admin shadow-sm",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 sm:size-5",
                      isSelected ? "text-white" : "text-dark",
                    )}
                    aria-hidden
                  />

                  <p
                    className={cn(
                      "hidden sm:block",
                      isSelected ? "text-white" : "text-dark",
                    )}
                  >
                    {link.text}
                  </p>

                  {showAdminBadge ? (
                    <span
                      className={cn(
                        "admin-sidebar-badge",
                        isSelected && "admin-sidebar-badge--selected",
                      )}
                      aria-label={`${pendingAdminCount} pending admin requests`}
                    >
                      {pendingAdminCount > 99 ? "99+" : pendingAdminCount}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="user">
        <Avatar className="size-8 sm:size-10">
          <AvatarFallback className="bg-amber-100 text-xs sm:text-sm">
            {getInitials(session?.user?.name || "IN")}
          </AvatarFallback>
        </Avatar>

        <div className="hidden flex-col sm:flex">
          <p className="font-semibold text-dark-200">{session?.user?.name}</p>
          <p className="text-xs text-light-500">{session?.user?.email}</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
