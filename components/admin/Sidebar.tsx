"use client";

/**
 * Admin sidebar nav.
 * Badges: pending make-admin (All Users), pending sign-ups, pending borrows.
 * PrefetchLink warms list caches; SSR seeds pending lists for densify (no cold fetch).
 */

import { adminSideBarLinks, type AdminSidebarIconKey } from "@/constants";
import Link from "next/link";
import PrefetchLink, { type PrefetchKind } from "@/components/PrefetchLink";
import { cn, getInitials } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Session } from "next-auth";
import {
  useBorrowRequests,
  useOpenTicketCount,
  usePendingAdminRequests,
  usePendingReviewCount,
  usePendingUsers,
} from "@/hooks/useQueries";
import type { AdminRequest, User } from "@/lib/services/users";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
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

const PREFETCH_KIND_BY_ROUTE: Partial<Record<string, PrefetchKind>> = {
  "/admin": "admin-dashboard",
  "/admin/users": "admin-users",
  "/admin/books": "admin-books",
  "/admin/book-requests": "admin-book-requests",
  "/admin/account-requests": "admin-account-requests",
  "/admin/book-reviews": "admin-reviews",
  "/admin/support-tickets": "admin-tickets",
};

function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

const Sidebar = ({
  session,
  initialPendingAdminRequests = [],
  initialPendingSignUps = [],
  initialPendingSignUpCount = 0,
  initialPendingBorrows = [],
  initialPendingBorrowCount = 0,
  initialOpenTicketCount = 0,
  initialPendingReviewCount = 0,
}: {
  session: Session;
  /** SSR seed for pending make-admin requests (All Users badge) */
  initialPendingAdminRequests?: AdminRequest[];
  /** SSR seed for pending signup users (Sign-up badge densify) */
  initialPendingSignUps?: User[];
  /** SSR count fallback for Sign-up Requests badge */
  initialPendingSignUpCount?: number;
  /** SSR seed for PENDING borrows (Borrow Requests badge densify) */
  initialPendingBorrows?: BorrowRecordWithDetails[];
  /** SSR count fallback for Borrow Requests badge */
  initialPendingBorrowCount?: number;
  /** SSR count for Support Tickets badge (OPEN + IN_PROGRESS) */
  initialOpenTicketCount?: number;
  /** SSR count for Book Reviews badge (PENDING moderation) */
  initialPendingReviewCount?: number;
}) => {
  const pathname = usePathname();
  const { data: pendingAdminRequests } = usePendingAdminRequests(
    initialPendingAdminRequests,
  );
  const { data: pendingSignUps } = usePendingUsers(initialPendingSignUps);
  const { data: pendingBorrows } = useBorrowRequests(
    { status: "PENDING" },
    initialPendingBorrows,
  );
  const { data: openTicketCount } = useOpenTicketCount(initialOpenTicketCount);
  const { data: pendingReviewCount } = usePendingReviewCount(
    initialPendingReviewCount,
  );

  const pendingAdminCount = (
    pendingAdminRequests ?? initialPendingAdminRequests
  ).length;
  const pendingSignUpCount =
    pendingSignUps?.length ?? initialPendingSignUpCount;
  const pendingBorrowCount =
    pendingBorrows?.length ?? initialPendingBorrowCount;
  const ticketBadgeCount = openTicketCount ?? initialOpenTicketCount ?? 0;
  const reviewBadgeCount = pendingReviewCount ?? initialPendingReviewCount ?? 0;

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

            let badgeCount = 0;
            let badgeLabel = "";
            if (link.route === "/admin/users" && pendingAdminCount > 0) {
              badgeCount = pendingAdminCount;
              badgeLabel = `${pendingAdminCount} pending admin requests`;
            } else if (
              link.route === "/admin/account-requests" &&
              pendingSignUpCount > 0
            ) {
              badgeCount = pendingSignUpCount;
              badgeLabel = `${pendingSignUpCount} pending sign-up requests`;
            } else if (
              link.route === "/admin/book-requests" &&
              pendingBorrowCount > 0
            ) {
              badgeCount = pendingBorrowCount;
              badgeLabel = `${pendingBorrowCount} pending borrow requests`;
            } else if (
              link.route === "/admin/support-tickets" &&
              ticketBadgeCount > 0
            ) {
              badgeCount = ticketBadgeCount;
              badgeLabel = `${ticketBadgeCount} open support tickets`;
            } else if (
              link.route === "/admin/book-reviews" &&
              reviewBadgeCount > 0
            ) {
              badgeCount = reviewBadgeCount;
              badgeLabel = `${reviewBadgeCount} reviews awaiting moderation`;
            }

            const Icon = ADMIN_SIDEBAR_ICONS[link.icon];
            const prefetchKind = PREFETCH_KIND_BY_ROUTE[link.route];

            return (
              <PrefetchLink
                href={link.route}
                key={link.route}
                prefetchKind={prefetchKind}
              >
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

                  {badgeCount > 0 ? (
                    <span
                      className={cn(
                        "admin-sidebar-badge",
                        isSelected && "admin-sidebar-badge--selected",
                      )}
                      aria-label={badgeLabel}
                    >
                      {formatBadgeCount(badgeCount)}
                    </span>
                  ) : null}
                </div>
              </PrefetchLink>
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
