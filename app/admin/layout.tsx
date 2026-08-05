import React, { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import "@/styles/admin.css";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { db } from "@/database/drizzle";
import { borrowRecords, users } from "@/database/schema";
import { count, eq } from "drizzle-orm";
import { getPendingAdminRequests } from "@/lib/admin/actions/admin-requests";
import type { AdminRequest } from "@/lib/services/users";
import { getOpenTicketCount } from "@/lib/server/supportTicketData";
import { getPendingReviewCount } from "@/lib/server/reviewData";
import { getUnreadNotificationCount } from "@/lib/notifications/inApp";

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

  // SSR seeds for sidebar badges (live updates via user.write / borrow.lifecycle / admin-request.write / ticket.write / review.write)
  const [
    pendingResult,
    pendingSignUpRow,
    pendingBorrowRow,
    openTicketCount,
    pendingReviewCount,
    initialUnreadCount,
  ] = await Promise.all([
    getPendingAdminRequests(),
    db
      .select({ value: count() })
      .from(users)
      .where(eq(users.status, "PENDING")),
    db
      .select({ value: count() })
      .from(borrowRecords)
      .where(eq(borrowRecords.status, "PENDING")),
    getOpenTicketCount(),
    getPendingReviewCount(),
    getUnreadNotificationCount(session.user.id),
  ]);

  const initialPendingAdminRequests: AdminRequest[] = pendingResult.success
    ? ((pendingResult.data || []) as AdminRequest[])
    : [];
  const initialPendingSignUpCount = Number(pendingSignUpRow[0]?.value ?? 0);
  const initialPendingBorrowCount = Number(pendingBorrowRow[0]?.value ?? 0);

  return (
    <main className="flex min-h-screen w-full flex-row">
      <Sidebar
        session={session}
        initialPendingAdminRequests={initialPendingAdminRequests}
        initialPendingSignUpCount={initialPendingSignUpCount}
        initialPendingBorrowCount={initialPendingBorrowCount}
        initialOpenTicketCount={openTicketCount}
        initialPendingReviewCount={pendingReviewCount}
      />

      <div className="admin-container">
        <Header session={session} initialUnreadCount={initialUnreadCount} />
        {children}
      </div>
    </main>
  );
};
export default Layout;
