import Link from "next/link";
import { Session } from "next-auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import AdminDropdown from "@/components/AdminDropdown";
import ProfileDropdown from "@/components/ProfileDropdown";
import MobileMenu from "@/components/MobileMenu";
import RootHeaderShell from "@/components/RootHeaderShell";

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

  // RSC data + client RootHeaderShell (transparent at top, blur-sm when scrolled).
  return (
    <RootHeaderShell>
      <Link href="/" className="flex items-center gap-2 sm:gap-3">
        <img
          src="/icons/logo.svg"
          alt="logo"
          width={40}
          height={40}
          className="size-8 sm:size-10"
        />
        <span className="text-lg font-semibold text-light-100 sm:text-xl">
          BookWise
        </span>
      </Link>

      {/* Desktop Navigation - Hidden on mobile and sm screens */}
      <ul className="hidden flex-row items-center gap-4 text-light-100 sm:gap-6 md:flex md:gap-8">
        {/* <li>
          <Link href="/">Home</Link>
        </li> */}
        <li className="hover:text-light-200">
          <Link href="/all-books">All Books</Link>
        </li>
        <li className="hover:text-light-200">
          <Link href="/my-profile">Borrow History</Link>
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
    </RootHeaderShell>
  );
};

export default Header;
