"use client";

/**
 * Admin sidebar nav.
 * All Users shows a live PENDING admin-request count (SSR seed + RQ invalidation).
 */

import { adminSideBarLinks } from "@/constants";
import Link from "next/link";
import { cn, getInitials } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Session } from "next-auth";
import { usePendingAdminRequests } from "@/hooks/useQueries";
import type { AdminRequest } from "@/lib/services/users";

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

            return (
              <Link href={link.route} key={link.route}>
                <div
                  className={cn(
                    "link",
                    isSelected && "bg-primary-admin shadow-sm",
                  )}
                >
                  <div className="relative size-4 sm:size-5">
                    <img
                      src={link.img}
                      alt="icon"
                      className={`${isSelected ? "brightness-0 invert" : ""}  object-contain`}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>

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
