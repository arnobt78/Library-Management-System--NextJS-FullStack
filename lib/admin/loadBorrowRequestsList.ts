/**
 * Shared Borrow Queue list query — SSR + GET /api/admin/borrow-requests parity.
 * Joins approver/returner/canceler so Status & Issuer densify survives invalidate refetch.
 * Auth is the caller's responsibility (requireAdminActor / authorizeAdminRoute).
 * Parent: borrow actor flash fix / dialog inventory DNA
 */

import { db } from "@/database/drizzle";
import { borrowRecords, books, reservations, users } from "@/database/schema";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import { serializeBorrowTimestamp } from "@/lib/borrows/serializeBorrowTimestamp";
import { getDailyFineAmount } from "@/lib/admin/actions/config";
import { computeDisplayFineForBorrowRow } from "@/lib/fines/mapDisplayFine";
import { getFineRateHistory } from "@/lib/fines/rateHistory";

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
  approvedAt?: string | Date | null;
  cancelledAt?: string | Date | null;
  renewedAt?: string | Date | null;
  status: string;
  borrowedBy: string | null;
  returnedBy: string | null;
  fineAmount: string | null;
  displayFineAmount?: string | null;
  fineStatus?: string | null;
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
  bookAvailableCopies?: number | null;
  bookTotalCopies?: number | null;
  bookWaitingHolds?: number | string | null;
  bookIsbn?: string | null;
  bookPublicationYear?: number | null;
  bookPublisher?: string | null;
  bookLanguage?: string | null;
  bookPageCount?: number | null;
  bookEdition?: string | null;
  bookIsActive?: boolean | null;
  bookCreatedAt?: Date | string | null;
  bookUpdatedAt?: Date | string | null;
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
  const isCancelled = record.status === "CANCELLED";
  const waitingRaw = record.bookWaitingHolds;
  const waitingHolds =
    typeof waitingRaw === "number"
      ? waitingRaw
      : typeof waitingRaw === "string"
        ? Number.parseInt(waitingRaw, 10)
        : 0;
  return {
    id: record.id,
    userId: record.userId,
    bookId: record.bookId,
    borrowDate: record.borrowDate,
    dueDate: serializeBorrowTimestamp(record.dueDate),
    returnDate: serializeBorrowTimestamp(record.returnDate),
    approvedAt: serializeBorrowTimestamp(record.approvedAt),
    cancelledAt: serializeBorrowTimestamp(record.cancelledAt),
    renewedAt: serializeBorrowTimestamp(record.renewedAt),
    status: record.status as "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED",
    borrowedBy: record.borrowedBy,
    returnedBy: record.returnedBy,
    fineAmount: record.fineAmount || "0.00",
    displayFineAmount: record.displayFineAmount ?? record.fineAmount ?? "0.00",
    fineStatus: (record.fineStatus as BorrowRecordWithDetails["fineStatus"]) ?? "NONE",
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
    bookAvailableCopies: record.bookAvailableCopies ?? null,
    bookTotalCopies: record.bookTotalCopies ?? null,
    bookWaitingHolds: Number.isFinite(waitingHolds) ? waitingHolds : 0,
    bookIsbn: record.bookIsbn ?? null,
    bookPublicationYear: record.bookPublicationYear ?? null,
    bookPublisher: record.bookPublisher ?? null,
    bookLanguage: record.bookLanguage ?? null,
    bookPageCount: record.bookPageCount ?? null,
    bookEdition: record.bookEdition ?? null,
    bookIsActive: record.bookIsActive ?? null,
    bookCreatedAt: record.bookCreatedAt ?? null,
    bookUpdatedAt: record.bookUpdatedAt ?? null,
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

/** WAITING holds count for one book — Approve / Mark Returned dialog chip. */
const bookWaitingHoldsSql = sql<number>`(
  SELECT COUNT(*)::int
  FROM ${reservations}
  WHERE ${reservations.bookId} = ${books.id}
    AND ${reservations.status} = 'WAITING'
)`.mapWith(Number);

/**
 * Load Borrow Queue rows with approver/returner/canceler joins + inventory/holds.
 * Optional status + search filters (API list).
 */
export async function loadAllBorrowRequestsRows(
  filters?: BorrowRequestListFilters,
): Promise<BorrowRecordWithDetails[]> {
  const [dailyRate, rateHistory] = await Promise.all([
    getDailyFineAmount(),
    getFineRateHistory(),
  ]);
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
      approvedAt: borrowRecords.approvedAt,
      cancelledAt: borrowRecords.cancelledAt,
      renewedAt: borrowRecords.renewedAt,
      status: borrowRecords.status,
      createdAt: borrowRecords.createdAt,
      borrowedBy: borrowRecords.borrowedBy,
      returnedBy: borrowRecords.returnedBy,
      fineAmount: borrowRecords.fineAmount,
      fineStatus: borrowRecords.fineStatus,
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
      bookAvailableCopies: books.availableCopies,
      bookTotalCopies: books.totalCopies,
      bookWaitingHolds: bookWaitingHoldsSql,
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

  return rows.map((row) => {
    const mapped = mapBorrowRequestRow(row);
    const { displayFineAmount } = computeDisplayFineForBorrowRow(
      {
        status: mapped.status,
        dueDate: mapped.dueDate,
        fineAmount: mapped.fineAmount,
        fineStatus: mapped.fineStatus,
      },
      dailyRate,
      rateHistory,
    );
    return { ...mapped, displayFineAmount };
  });
}
