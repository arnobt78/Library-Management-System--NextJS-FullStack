/**
 * Admin layout — full-bleed shell (no max-w-9xl) + frosted Header/Sidebar.
 * Viewport scrolls; shell does not clip sticky Header/Sidebar.
 * Page bg slate-50 shows through frosted chrome.
 * Parent: admin shell Stockly chrome
 */

import { type ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import "@/styles/admin.css";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/Header";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { getAdminNavCounts } from "@/lib/server/adminNavCounts";

const Layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();

  if (!session?.user?.id) redirect("/sign-in");

  const currentUser = await db
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then((res) => res[0]);

  if (currentUser?.role !== "ADMIN" || currentUser.status !== "APPROVED") {
    redirect("/");
  }

  const initialNavCounts = await getAdminNavCounts();

  return (
    <main className="admin-shell flex min-h-screen w-full flex-col bg-slate-50">
      {/* Full-bleed sticky ancestor — sidebar flush left, content expands with viewport */}
      <div className="admin-shell-inner flex min-h-screen w-full max-w-none flex-col">
        <Header session={session} tone="light" />
        <div className="flex min-h-0 w-full flex-1 flex-row items-stretch">
          <Sidebar initialNavCounts={initialNavCounts} />
          <div className="admin-container">{children}</div>
        </div>
      </div>
    </main>
  );
};
export default Layout;
