/**
 * Shared Borrow Queue list query — SSR + GET /api/admin/borrow-requests parity.
 * Joins approver/returner/canceler so Status & Actor densify survives invalidate refetch.
 * Auth is the caller's responsibility (requireAdminActor / authorizeAdminRoute).
 * Parent: borrow actor flash fix
 */

import { db } from "@/database/drizzle";
import { borrowRecords, books, users } from "@/database/schema";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";

export type BorrowRequestListFilters = {
  status?: "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED" | string | null;
  search?: string | null;
};

/** Map DB join row → admin BorrowRecordWithDetails (list + detail). */
export function mapBorrowRequestRow(record: {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: Date | null;
  dueDate: string | Date | null;
  returnDate: string | Date | null;
  status: string;
  borrowedBy: string | null;
  returnedBy: string | null;
  fineAmount: string | null;
  notes: string | null;
  renewalCount: number;
  lastReminderSent: Date | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  createdAt: Date | null;
  userName: string;
  userEmail: string;
  userUniversityId: number;
  userUniversityCard: string | null;
  bookTitle: string;
  bookAuthor: string;
  bookGenre: string;
  bookRating: number | null;
  bookCoverUrl: string | null;
  bookCoverColor: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedByEmail?: string | null;
  approvedByCard?: string | null;
  returnedById?: string | null;
  returnedByName?: string | null;
  returnedByEmail?: string | null;
  returnedByCard?: string | null;
  cancelledById?: string | null;
  cancelledByName?: string | null;
  cancelledByEmail?: string | null;
  cancelledByCard?: string | null;
}): BorrowRecordWithDetails {
  const dueDateValue = record.dueDate;
  let dueDateStr: string | null = null;
  if (dueDateValue) {
    dueDateStr =
      typeof dueDateValue === "string"
        ? dueDateValue
        : dueDateValue.toISOString().split("T")[0];
  }
  const returnDateValue = record.returnDate;
  let returnDateStr: string | null = null;
  if (returnDateValue) {
    returnDateStr =
      typeof returnDateValue === "string"
        ? returnDateValue
        : returnDateValue.toISOString().split("T")[0];
  }
  const isCancelled = record.status === "CANCELLED";
  return {
    id: record.id,
    userId: record.userId,
    bookId: record.bookId,
    borrowDate: record.borrowDate,
    dueDate: dueDateStr,
    returnDate: returnDateStr,
    status: record.status as "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED",
    borrowedBy: record.borrowedBy,
    returnedBy: record.returnedBy,
    fineAmount: record.fineAmount || "0.00",
    notes: record.notes,
    renewalCount: record.renewalCount,
    lastReminderSent: record.lastReminderSent,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt,
    userName: record.userName,
    userEmail: record.userEmail,
    userUniversityId: record.userUniversityId,
    userUniversityCard: record.userUniversityCard ?? null,
    bookTitle: record.bookTitle,
    bookAuthor: record.bookAuthor,
    bookGenre: record.bookGenre,
    bookRating: record.bookRating ?? null,
    bookCoverUrl: record.bookCoverUrl,
    bookCoverColor: record.bookCoverColor,
    approvedByActor:
      record.approvedById && record.approvedByEmail && record.approvedByName
        ? {
            id: record.approvedById,
            fullName: record.approvedByName,
            email: record.approvedByEmail,
            universityCard: record.approvedByCard ?? null,
          }
        : null,
    returnedByActor:
      record.returnedById && record.returnedByEmail && record.returnedByName
        ? {
            id: record.returnedById,
            fullName: record.returnedByName,
            email: record.returnedByEmail,
            universityCard: record.returnedByCard ?? null,
          }
        : null,
    cancelledByActor:
      isCancelled &&
      record.cancelledById &&
      record.cancelledByEmail &&
      record.cancelledByName
        ? {
            id: record.cancelledById,
            fullName: record.cancelledByName,
            email: record.cancelledByEmail,
            universityCard: record.cancelledByCard ?? null,
          }
        : null,
  };
}

/**
 * Load Borrow Queue rows with approver/returner/canceler joins.
 * Optional status + search filters (API list).
 */
export async function loadAllBorrowRequestsRows(
  filters?: BorrowRequestListFilters,
): Promise<BorrowRecordWithDetails[]> {
  const approverUsers = alias(users, "borrow_approver_users");
  const returnerUsers = alias(users, "borrow_returner_users");
  const cancelerUsers = alias(users, "borrow_canceler_users");

  const whereConditions: SQL[] = [];
  const status = filters?.status?.trim();
  if (
    status &&
    (status === "PENDING" ||
      status === "BORROWED" ||
      status === "RETURNED" ||
      status === "CANCELLED")
  ) {
    whereConditions.push(eq(borrowRecords.status, status));
  }
  const search = filters?.search?.trim();
  if (search) {
    const searchPattern = `%${search}%`;
    const searchOr = or(
      ilike(books.title, searchPattern),
      ilike(books.author, searchPattern),
      ilike(users.fullName, searchPattern),
      ilike(users.email, searchPattern),
      sql`CAST(${users.universityId} AS TEXT) ILIKE ${searchPattern}`,
    );
    if (searchOr) whereConditions.push(searchOr);
  }

  const rows = await db
    .select({
      id: borrowRecords.id,
      userId: borrowRecords.userId,
      bookId: borrowRecords.bookId,
      borrowDate: borrowRecords.borrowDate,
      dueDate: borrowRecords.dueDate,
      returnDate: borrowRecords.returnDate,
      status: borrowRecords.status,
      createdAt: borrowRecords.createdAt,
      borrowedBy: borrowRecords.borrowedBy,
      returnedBy: borrowRecords.returnedBy,
      fineAmount: borrowRecords.fineAmount,
      notes: borrowRecords.notes,
      renewalCount: borrowRecords.renewalCount,
      lastReminderSent: borrowRecords.lastReminderSent,
      updatedAt: borrowRecords.updatedAt,
      updatedBy: borrowRecords.updatedBy,
      userName: users.fullName,
      userEmail: users.email,
      userUniversityId: users.universityId,
      userUniversityCard: users.universityCard,
      bookTitle: books.title,
      bookAuthor: books.author,
      bookGenre: books.genre,
      bookRating: books.rating,
      bookCoverUrl: books.coverUrl,
      bookCoverColor: books.coverColor,
      approvedById: approverUsers.id,
      approvedByName: approverUsers.fullName,
      approvedByEmail: approverUsers.email,
      approvedByCard: approverUsers.universityCard,
      returnedById: returnerUsers.id,
      returnedByName: returnerUsers.fullName,
      returnedByEmail: returnerUsers.email,
      returnedByCard: returnerUsers.universityCard,
      cancelledById: cancelerUsers.id,
      cancelledByName: cancelerUsers.fullName,
      cancelledByEmail: cancelerUsers.email,
      cancelledByCard: cancelerUsers.universityCard,
    })
    .from(borrowRecords)
    .innerJoin(users, eq(borrowRecords.userId, users.id))
    .innerJoin(books, eq(borrowRecords.bookId, books.id))
    .leftJoin(approverUsers, eq(borrowRecords.borrowedBy, approverUsers.email))
    .leftJoin(returnerUsers, eq(borrowRecords.returnedBy, returnerUsers.email))
    .leftJoin(cancelerUsers, eq(borrowRecords.updatedBy, cancelerUsers.email))
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(desc(borrowRecords.createdAt));

  return rows.map((row) => mapBorrowRequestRow(row));
}
