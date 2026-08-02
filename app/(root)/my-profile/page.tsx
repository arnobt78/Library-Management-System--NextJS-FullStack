import React from "react";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { borrowRecords, books, bookReviews } from "@/database/schema";
import { eq, desc, sql } from "drizzle-orm";
import MyProfileTabs from "@/components/MyProfileTabs";
import ReservationsPanel, {
  type ReservationSummary,
} from "@/components/ReservationsPanel";

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

  // Fetch user's reviews count
  const userReviews = await db
    .select()
    .from(bookReviews)
    .where(eq(bookReviews.userId, session.user.id));

  const totalReviews = userReviews.length;

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

  const reservationResult = await db.execute(sql`
    SELECT r.id,
      CASE WHEN r.status = 'READY' AND r.ready_expires_at <= CURRENT_TIMESTAMP
        THEN 'EXPIRED' ELSE r.status END AS status,
      r.ready_expires_at, b.title AS book_title,
      CASE WHEN r.status = 'WAITING' THEN (
        SELECT COUNT(*)::int FROM reservations ahead
        WHERE ahead.book_id = r.book_id AND ahead.status = 'WAITING'
          AND (ahead.created_at, ahead.id) <= (r.created_at, r.id)
      ) ELSE NULL END AS queue_position
    FROM reservations r JOIN books b ON b.id = r.book_id
    WHERE r.user_id = ${session.user.id}
    ORDER BY r.created_at DESC LIMIT 25
  `);
  const initialReservations = reservationResult.rows.map((row) => ({
    id: String(row.id),
    status: String(row.status) as ReservationSummary["status"],
    bookTitle: String(row.book_title),
    queuePosition:
      row.queue_position == null ? null : Number(row.queue_position),
    readyExpiresAt:
      row.ready_expires_at == null ? null : String(row.ready_expires_at),
  }));

  return (
    <>
      <ReservationsPanel initialReservations={initialReservations} />
      <MyProfileTabs
        userId={session.user.id}
        initialActiveBorrows={activeBorrows}
        initialPendingRequests={pendingRequests}
        initialBorrowHistory={borrowHistory}
        totalReviews={totalReviews}
      />
    </>
  );
};

export default Page;
