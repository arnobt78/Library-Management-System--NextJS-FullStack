/**
 * Admin layout — SSR seeds sidebar badges + pending lists for densify (no cold badge fetch).
 */

import React, { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import "@/styles/admin.css";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { db } from "@/database/drizzle";
import { books, borrowRecords, users } from "@/database/schema";
import { desc, eq } from "drizzle-orm";
import { getPendingAdminRequests } from "@/lib/admin/actions/admin-requests";
import type { AdminRequest } from "@/lib/services/users";
import type { User } from "@/lib/services/users";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
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

  // SSR seeds for sidebar badges + densify list keys (signup / borrow PENDING).
  const [
    pendingResult,
    pendingSignUpUsers,
    pendingBorrowRows,
    openTicketCount,
    pendingReviewCount,
    initialUnreadCount,
  ] = await Promise.all([
    getPendingAdminRequests(),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityId: users.universityId,
        universityCard: users.universityCard,
        status: users.status,
        role: users.role,
        lastActivityDate: users.lastActivityDate,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.status, "PENDING"))
      .orderBy(desc(users.createdAt))
      .limit(100),
    db
      .select({
        id: borrowRecords.id,
        userId: borrowRecords.userId,
        bookId: borrowRecords.bookId,
        borrowDate: borrowRecords.borrowDate,
        dueDate: borrowRecords.dueDate,
        returnDate: borrowRecords.returnDate,
        status: borrowRecords.status,
        createdAt: borrowRecords.createdAt,
        userName: users.fullName,
        userEmail: users.email,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookGenre: books.genre,
        bookCoverUrl: books.coverUrl,
        bookCoverColor: books.coverColor,
      })
      .from(borrowRecords)
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(eq(borrowRecords.status, "PENDING"))
      .orderBy(desc(borrowRecords.createdAt))
      .limit(100),
    getOpenTicketCount(),
    getPendingReviewCount(),
    getUnreadNotificationCount(session.user.id),
  ]);

  const initialPendingAdminRequests: AdminRequest[] = pendingResult.success
    ? ((pendingResult.data || []) as AdminRequest[])
    : [];

  const initialPendingSignUps = pendingSignUpUsers as User[];

  const initialPendingBorrows = pendingBorrowRows.map((row) => ({
    id: row.id,
    userId: row.userId,
    bookId: row.bookId,
    borrowDate: row.borrowDate,
    dueDate: row.dueDate,
    returnDate: row.returnDate,
    status: row.status as BorrowRecordWithDetails["status"],
    createdAt: row.createdAt,
    borrowedBy: null,
    returnedBy: null,
    fineAmount: "0",
    notes: null,
    renewalCount: 0,
    lastReminderSent: null,
    updatedAt: null,
    updatedBy: null,
    userName: row.userName,
    userEmail: row.userEmail,
    userUniversityId: 0,
    bookTitle: row.bookTitle,
    bookAuthor: row.bookAuthor,
    bookGenre: row.bookGenre,
    bookCoverUrl: row.bookCoverUrl,
    bookCoverColor: row.bookCoverColor,
  })) as BorrowRecordWithDetails[];

  const initialPendingSignUpCount = initialPendingSignUps.length;
  const initialPendingBorrowCount = initialPendingBorrows.length;

  return (
    <main className="flex min-h-screen w-full flex-row">
      <Sidebar
        session={session}
        initialPendingAdminRequests={initialPendingAdminRequests}
        initialPendingSignUps={initialPendingSignUps}
        initialPendingSignUpCount={initialPendingSignUpCount}
        initialPendingBorrows={initialPendingBorrows}
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
