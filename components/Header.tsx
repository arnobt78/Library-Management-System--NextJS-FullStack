import Link from "next/link";
import { Session } from "next-auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import AdminDropdown from "@/components/AdminDropdown";
import LogoutButton from "@/components/LogoutButton";

interface HeaderProps {
  session: Session;
}

const Header = async ({ session }: HeaderProps) => {
  // Check if user is admin
  const userRole = session?.user?.id
    ? await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1)
        .then((res) => res[0]?.role)
    : null;

  const isAdmin = userRole === "ADMIN";

  return (
    <header className="my-10 flex justify-between">
      <Link href="/">
        <img src="/icons/logo.svg" alt="logo" width={40} height={40} />
      </Link>

      <ul className="flex flex-row items-center gap-8 text-light-100">
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
        {isAdmin ? (
          <li>
            <AdminDropdown />
          </li>
        ) : (
          <li>
            <Link
              href="/make-admin"
              className="text-light-100 hover:text-light-200"
            >
              Become Admin
            </Link>
          </li>
        )}

        {/* User email */}
        {session?.user?.email && (
          <li className="font-bold text-light-100">{session.user.email}</li>
        )}

        {/* Logout button */}
        <li>
          <LogoutButton />
        </li>
      </ul>
    </header>
  );
};

export default Header;
