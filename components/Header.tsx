/**
 * Shared BookWise navbar — public (dark) and admin (light) via `tone`.
 * Brand → `/`; SSR-seeds notification shell (list + unread + total) for
 * densify-safe first paint without dropdown skeleton flash.
 */

import Link from "next/link";
import { Session } from "next-auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import AdminDropdown from "@/components/AdminDropdown";
import ProfileDropdown from "@/components/ProfileDropdown";
import MobileMenu from "@/components/MobileMenu";
import RootHeaderShell, {
  type HeaderTone,
} from "@/components/RootHeaderShell";
import NotificationBell from "@/components/NotificationBell";
import PrefetchLink from "@/components/PrefetchLink";
import { getNotificationShellForUser } from "@/lib/notifications/inApp";

interface HeaderProps {
  session: Session;
  /** Admin layout passes "light"; root/api pages keep default "dark". */
  tone?: HeaderTone;
}

const Header = async ({ session, tone = "dark" }: HeaderProps) => {
  const sessionUserId = session?.user?.id;
  const isLight = tone === "light";

  // Fetch user data including role and profile info
  const userData = sessionUserId
    ? await db
        .select({
          role: users.role,
          fullName: users.fullName,
          email: users.email,
          universityId: users.universityId,
          universityCard: users.universityCard,
        })
        .from(users)
        .where(eq(users.id, sessionUserId))
        .limit(1)
        .then((res) => res[0])
    : null;

  const isAdmin = userData?.role === "ADMIN";

  // SSR shell: list + unread + total in one parallel round-trip.
  const notificationShell = sessionUserId
    ? await getNotificationShellForUser(sessionUserId)
    : undefined;

  const brandClass = isLight
    ? "text-lg font-medium text-dark-400 sm:text-xl"
    : "text-lg font-medium text-light-100 sm:text-xl";
  const navClass = isLight
    ? "hidden flex-row items-center gap-4 text-dark-400 sm:gap-6 md:flex md:gap-8"
    : "hidden flex-row items-center gap-4 text-light-100 sm:gap-6 md:flex md:gap-8";
  const linkHover = isLight
    ? "flex items-center hover:text-gray-700"
    : "flex items-center hover:text-light-200";

  const bellProps = {
    variant: (isLight ? "light" : "dark") as "light" | "dark",
    initialNotifications: notificationShell?.notifications,
    initialUnreadCount: notificationShell?.unreadCount,
    initialTotalCount: notificationShell?.totalCount,
  };

  return (
    <RootHeaderShell tone={tone}>
      <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
        <img
          src={isLight ? "/icons/admin/logo.svg" : "/icons/logo.svg"}
          alt="logo"
          width={40}
          height={40}
          className="block size-8 sm:size-10"
        />
        <span className={brandClass}>BookWise</span>
      </Link>

      {/* Desktop Navigation - Hidden on mobile and sm screens */}
      <ul className={navClass}>
        <li className={linkHover}>
          <PrefetchLink href="/all-books" prefetchKind="all-books">
            All Books
          </PrefetchLink>
        </li>
        <li className={linkHover}>
          <PrefetchLink
            href="/my-profile"
            prefetchKind="my-profile"
            userId={sessionUserId}
          >
            Borrow History
          </PrefetchLink>
        </li>
        {isAdmin && (
          <li className="flex items-center">
            <AdminDropdown tone={tone} />
          </li>
        )}

        {userData && (
          <li className="flex items-center">
            <NotificationBell {...bellProps} />
          </li>
        )}

        {userData && (
          <li className="flex items-center">
            <ProfileDropdown
              fullName={userData.fullName}
              email={userData.email}
              universityId={userData.universityId}
              universityCard={userData.universityCard}
              isAdmin={isAdmin}
              tone={tone}
            />
          </li>
        )}
      </ul>

      {/* Mobile Menu - Visible only on mobile and sm screens */}
      {userData && (
        <div className="flex items-center gap-1 md:hidden">
          <NotificationBell {...bellProps} />
          <MobileMenu
            fullName={userData.fullName}
            email={userData.email}
            universityId={userData.universityId}
            universityCard={userData.universityCard}
            isAdmin={isAdmin}
            tone={tone}
          />
        </div>
      )}
    </RootHeaderShell>
  );
};

export default Header;
