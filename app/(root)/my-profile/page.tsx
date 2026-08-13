import React from "react";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { borrowRecords, books, users } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import MyProfileTabs from "@/components/MyProfileTabs";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { loadUserReservationsSsr } from "@/lib/circulation/loadUserReservationsSsr";
import { getUserBookReviews } from "@/lib/server/reviewData";

const signupDecisionUsers = alias(users, "signup_decision_actor");

const Page = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="empty-panel">
        <p className="text-sm text-light-200 sm:text-base">
          Please sign in to view your profile.
        </p>
      </div>
    );
  }

  // Signup decision actor via statusReviewedBy (durable; not overwritten by role edits)
  const [accountRow] = await db
    .select({
      email: users.email,
      status: users.status,
      createdAt: users.createdAt,
      statusReviewedAt: users.statusReviewedAt,
      actorFullName: signupDecisionUsers.fullName,
      actorEmail: signupDecisionUsers.email,
      actorUniversityCard: signupDecisionUsers.universityCard,
    })
    .from(users)
    .leftJoin(
      signupDecisionUsers,
      eq(users.statusReviewedBy, signupDecisionUsers.id),
    )
    .where(eq(users.id, session.user.id))
    .limit(1);

  const accountStatus = accountRow?.status ?? null;
  const accountEmail = accountRow?.email ?? session.user.email ?? null;
  const accountCreatedAt = accountRow?.createdAt ?? null;
  const accountDecidedAt = accountRow?.statusReviewedAt ?? null;
  const accountDecisionActor: AdminRequestReviewer | null =
    accountRow?.actorEmail && accountRow?.actorFullName
      ? {
          fullName: accountRow.actorFullName,
          email: accountRow.actorEmail,
          universityCard: accountRow.actorUniversityCard ?? null,
        }
      : null;

  // SSR-hydrate the "My Reviews" tab (any status) — same shape the tab's
  // React Query hook fetches client-side, so first paint never shows a
  // loading skeleton and count/list can never drift apart. MyProfileTabs
  // derives the live count from this same query, so no separate count prop.
  const userReviews = await getUserBookReviews(session.user.id);

  // Fetch all borrow records for the current user with book details
  const allBorrowRecords = await db
    .select({
      // Borrow record fields
      id: borrowRecords.id,
      userId: borrowRecords.userId,
      bookId: borrowRecords.bookId,
      borrowDate: borrowRecords.borrowDate,
      dueDate: borrowRecords.dueDate,
      returnDate: borrowRecords.returnDate,
      status: borrowRecords.status,
      borrowedBy: borrowRecords.borrowedBy,
      returnedBy: borrowRecords.returnedBy,
      fineAmount: borrowRecords.fineAmount,
      notes: borrowRecords.notes,
      renewalCount: borrowRecords.renewalCount,
      lastReminderSent: borrowRecords.lastReminderSent,
      updatedAt: borrowRecords.updatedAt,
      updatedBy: borrowRecords.updatedBy,
      createdAt: borrowRecords.createdAt,
      // Book fields
      book: {
        id: books.id,
        title: books.title,
        author: books.author,
        genre: books.genre,
        rating: books.rating,
        totalCopies: books.totalCopies,
        availableCopies: books.availableCopies,
        description: books.description,
        coverColor: books.coverColor,
        coverUrl: books.coverUrl,
        videoUrl: books.videoUrl,
        summary: books.summary,
        isbn: books.isbn,
        publicationYear: books.publicationYear,
        publisher: books.publisher,
        language: books.language,
        pageCount: books.pageCount,
        edition: books.edition,
        isActive: books.isActive,
        createdAt: books.createdAt,
        updatedAt: books.updatedAt,
        updatedBy: books.updatedBy,
      },
    })
    .from(borrowRecords)
    .innerJoin(books, eq(borrowRecords.bookId, books.id))
    .where(eq(borrowRecords.userId, session.user.id))
    .orderBy(desc(borrowRecords.createdAt));

  // Convert dates to Date objects and separate records by status
  // Drizzle's date() type returns strings (YYYY-MM-DD), but BorrowRecordWithBook expects Date objects
  // Safe conversion: handle both string and Date types
  const activeBorrows = allBorrowRecords
    .filter((record) => record.status === "BORROWED")
    .map((record) => {
      // Safe date conversion: handle both string and Date types from Drizzle
      const dueDateValue = record.dueDate as string | Date | null;
      const returnDateValue = record.returnDate as string | Date | null;

      return {
        ...record,
        dueDate: dueDateValue
          ? typeof dueDateValue === "string"
            ? new Date(dueDateValue)
            : dueDateValue
          : null,
        returnDate: returnDateValue
          ? typeof returnDateValue === "string"
            ? new Date(returnDateValue)
            : returnDateValue
          : null,
        fineAmount: parseFloat(record.fineAmount || "0"),
      };
    });

  const pendingRequests = allBorrowRecords
    .filter((record) => record.status === "PENDING")
    .map((record) => {
      // Safe date conversion: handle both string and Date types from Drizzle
      const dueDateValue = record.dueDate as string | Date | null;
      const returnDateValue = record.returnDate as string | Date | null;

      return {
        ...record,
        dueDate: dueDateValue
          ? typeof dueDateValue === "string"
            ? new Date(dueDateValue)
            : dueDateValue
          : null,
        returnDate: returnDateValue
          ? typeof returnDateValue === "string"
            ? new Date(returnDateValue)
            : returnDateValue
          : null,
        fineAmount: parseFloat(record.fineAmount || "0"),
      };
    });

  const borrowHistory = allBorrowRecords.map((record) => {
    // Safe date conversion: handle both string and Date types from Drizzle
    const dueDateValue = record.dueDate as string | Date | null;
    const returnDateValue = record.returnDate as string | Date | null;

    return {
      ...record,
      dueDate: dueDateValue
        ? typeof dueDateValue === "string"
          ? new Date(dueDateValue)
          : dueDateValue
        : null,
      returnDate: returnDateValue
        ? typeof returnDateValue === "string"
          ? new Date(returnDateValue)
          : returnDateValue
        : null,
      fineAmount: parseFloat(record.fineAmount || "0"),
    };
  });

  const initialReservations = await loadUserReservationsSsr(session.user.id);

  return (
    <>
      <MyProfileTabs
        userId={session.user.id}
        accountStatus={accountStatus}
        accountEmail={accountEmail}
        accountCreatedAt={accountCreatedAt}
        accountDecidedAt={accountDecidedAt}
        accountDecisionActor={accountDecisionActor}
        initialActiveBorrows={activeBorrows}
        initialPendingRequests={pendingRequests}
        initialBorrowHistory={borrowHistory}
        initialReviews={userReviews}
        initialReservations={initialReservations}
      />
    </>
  );
};

export default Page;
