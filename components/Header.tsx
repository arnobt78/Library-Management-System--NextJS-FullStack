import Link from "next/link";
import { Session } from "next-auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import AdminDropdown from "@/components/AdminDropdown";
import ProfileDropdown from "@/components/ProfileDropdown";
import MobileMenu from "@/components/MobileMenu";

interface HeaderProps {
  session: Session;
}

const Header = async ({ session }: HeaderProps) => {
  // Fetch user data including role and profile info
  const userData = session?.user?.id
    ? await db
        .select({
          role: users.role,
          fullName: users.fullName,
          email: users.email,
          universityId: users.universityId,
          universityCard: users.universityCard,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1)
        .then((res) => res[0])
    : null;

  const isAdmin = userData?.role === "ADMIN";

  return (
    <header className="my-10 flex justify-between">
      <Link href="/" className="flex items-center gap-3">
        <img src="/icons/logo.svg" alt="logo" width={40} height={40} />
        <span className="text-xl font-bold text-light-100">BookWise</span>
      </Link>

      {/* Desktop Navigation - Hidden on mobile and sm screens */}
      <ul className="hidden flex-row items-center gap-8 text-light-100 md:flex">
        {/* <li>
          <Link href="/">Home</Link>
        </li> */}
        <li className="hover:text-light-200">
          <Link href="/all-books">All Books</Link>
        </li>
        <li className="hover:text-light-200">
          <Link href="/my-profile">My Profile</Link>
        </li>
        <li className="hover:text-light-200">
          <Link href="/api-docs">API Docs</Link>
        </li>
        <li className="hover:text-light-200">
          <Link href="/api-status">API Status</Link>
        </li>
        <li className="hover:text-light-200">
          <Link href="/performance">Performance</Link>
        </li>

        {/* Admin-only navigation items */}
        {isAdmin && (
          <li>
            <AdminDropdown />
          </li>
        )}

        {/* Profile dropdown with user image */}
        {userData && (
          <li>
            <ProfileDropdown
              fullName={userData.fullName}
              email={userData.email}
              universityId={userData.universityId}
              universityCard={userData.universityCard}
              isAdmin={isAdmin}
            />
          </li>
        )}
      </ul>

      {/* Mobile Menu - Visible only on mobile and sm screens */}
      {userData && (
        <div className="md:hidden">
          <MobileMenu
            fullName={userData.fullName}
            email={userData.email}
            universityId={userData.universityId}
            universityCard={userData.universityCard}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </header>
  );
};

export default Header;
