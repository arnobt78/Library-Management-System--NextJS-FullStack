// Parent: REQ-0029, REQ-0031

import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/database/drizzle";
import { requireAdminActor } from "@/lib/auth/authorization";
import { getDeterministicInsights } from "@/lib/admin/actions/analytics";
import { getDailyFineAmount } from "@/lib/admin/actions/config";
import { getFineRateHistory } from "@/lib/fines/rateHistory";
import { computeDisplayFineForBorrowRow } from "@/lib/fines/mapDisplayFine";
import { dueUtcBeforeTodaySql } from "@/lib/fines/dueCalendarSql";
import { parseProfilePagination } from "@/lib/actionInputs";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import type { AdminPrivilegeHistoryEntry } from "@/lib/admin/adminPrivilegeHistory";
import { activityHistoryForUserWhere } from "@/lib/admin/adminUserActivity";
import { loadSignupDecisionEntries } from "@/lib/admin/signupStatusDecisions";
import type { SignupRequestDecisionEntry } from "@/lib/admin/signupStatusDecisions";
import { annotateMissingActivityEntities } from "@/lib/server/annotateActivityEntityDeleted";
import {
  activityLogs,
  adminRequests,
  bookReviews,
  books,
  borrowRecords,
  reservations,
  supportTickets,
  users,
} from "@/database/schema";

const signupDecisionUsers = alias(users, "profile_signup_decision_actor");
const adminRequestReviewerUsers = alias(users, "profile_admin_request_reviewer");
const bookReviewModeratorUsers = alias(users, "profile_book_review_moderator");

export async function getAdminUserProfile(userId: string, page = 1, size = 25) {
  await requireAdminActor();
  const { page: safePage, size: safeSize } = parseProfilePagination(page, size);
  const offset = (safePage - 1) * safeSize;
  // Live outstanding matches Insights overdue table; does not persist fine_amount.
  const [dailyRate, rateHistory] = await Promise.all([
    getDailyFineAmount(),
    getFineRateHistory(),
  ]);

  const [
    userRow,
    history,
    reviewHistory,
    requestHistoryRows,
    reservationHistory,
    ticketHistory,
    activityHistory,
    metrics,
    userOverdueRows,
    genres,
    libraryInsights,
    signupDecisions,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityId: users.universityId,
        universityCard: users.universityCard,
        role: users.role,
        status: users.status,
        lastLogin: users.lastLogin,
        lastActivityDate: users.lastActivityDate,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        updatedBy: users.updatedBy,
        statusReviewedAt: users.statusReviewedAt,
        actorId: signupDecisionUsers.id,
        actorFullName: signupDecisionUsers.fullName,
        actorEmail: signupDecisionUsers.email,
        actorUniversityCard: signupDecisionUsers.universityCard,
      })
      .from(users)
      .leftJoin(
        signupDecisionUsers,
        eq(users.statusReviewedBy, signupDecisionUsers.id),
      )
      .where(eq(users.id, userId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        id: borrowRecords.id,
        status: borrowRecords.status,
        borrowDate: borrowRecords.borrowDate,
        dueDate: borrowRecords.dueDate,
        returnDate: borrowRecords.returnDate,
        approvedAt: borrowRecords.approvedAt,
        cancelledAt: borrowRecords.cancelledAt,
        renewedAt: borrowRecords.renewedAt,
        storedFineAmount: borrowRecords.fineAmount,
        fineStatus: borrowRecords.fineStatus,
        renewalCount: borrowRecords.renewalCount,
        createdAt: borrowRecords.createdAt,
        updatedAt: borrowRecords.updatedAt,
        bookId: books.id,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookCoverUrl: books.coverUrl,
        bookCoverColor: books.coverColor,
        bookGenre: books.genre,
        bookRating: books.rating,
      })
      .from(borrowRecords)
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(eq(borrowRecords.userId, userId))
      .orderBy(desc(borrowRecords.createdAt), desc(borrowRecords.id))
      .limit(safeSize)
      .offset(offset),
    db
      .select({
        id: bookReviews.id,
        rating: bookReviews.rating,
        comment: bookReviews.comment,
        status: bookReviews.status,
        createdAt: bookReviews.createdAt,
        reviewedAt: bookReviews.reviewedAt,
        reviewedBy: bookReviews.reviewedBy,
        moderatorFullName: bookReviewModeratorUsers.fullName,
        moderatorEmail: bookReviewModeratorUsers.email,
        moderatorUniversityCard: bookReviewModeratorUsers.universityCard,
        bookId: books.id,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookCoverUrl: books.coverUrl,
        bookCoverColor: books.coverColor,
        bookGenre: books.genre,
        bookRating: books.rating,
      })
      .from(bookReviews)
      .innerJoin(books, eq(bookReviews.bookId, books.id))
      .leftJoin(
        bookReviewModeratorUsers,
        eq(bookReviews.reviewedBy, bookReviewModeratorUsers.id),
      )
      .where(eq(bookReviews.userId, userId))
      .orderBy(desc(bookReviews.createdAt))
      .limit(25),
    db
      .select({
        id: adminRequests.id,
        status: adminRequests.status,
        requestReason: adminRequests.requestReason,
        rejectionReason: adminRequests.rejectionReason,
        createdAt: adminRequests.createdAt,
        reviewedAt: adminRequests.reviewedAt,
        reviewedBy: adminRequests.reviewedBy,
        reviewerFullName: adminRequestReviewerUsers.fullName,
        reviewerEmail: adminRequestReviewerUsers.email,
        reviewerUniversityCard: adminRequestReviewerUsers.universityCard,
      })
      .from(adminRequests)
      .leftJoin(
        adminRequestReviewerUsers,
        eq(adminRequests.reviewedBy, adminRequestReviewerUsers.id),
      )
      .where(eq(adminRequests.userId, userId))
      .orderBy(desc(adminRequests.createdAt))
      .limit(25),
    db
      .select({
        id: reservations.id,
        status: sql<string>`CASE WHEN ${reservations.status} = 'READY' AND ${reservations.readyExpiresAt} <= CURRENT_TIMESTAMP THEN 'EXPIRED' ELSE ${reservations.status} END`,
        createdAt: reservations.createdAt,
        readyExpiresAt: reservations.readyExpiresAt,
        bookId: books.id,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookCoverUrl: books.coverUrl,
        bookCoverColor: books.coverColor,
        bookGenre: books.genre,
        bookRating: books.rating,
      })
      .from(reservations)
      .innerJoin(books, eq(reservations.bookId, books.id))
      .where(eq(reservations.userId, userId))
      .orderBy(desc(reservations.createdAt))
      .limit(25),
    db
      .select({
        id: supportTickets.id,
        subject: supportTickets.subject,
        status: supportTickets.status,
        priority: supportTickets.priority,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
      })
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt))
      .limit(25),
    db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        details: activityLogs.details,
        createdAt: activityLogs.createdAt,
        actorId: activityLogs.actorId,
      })
      .from(activityLogs)
      .where(activityHistoryForUserWhere(userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(25),
    db.execute(
      sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending, COUNT(*) FILTER (WHERE status = 'BORROWED')::int AS current, COUNT(*) FILTER (WHERE status = 'RETURNED')::int AS returned, COUNT(*) FILTER (WHERE status = 'BORROWED' AND (due_date AT TIME ZONE 'UTC')::date < CURRENT_DATE)::int AS overdue, COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'RETURNED' AND (return_date IS NULL OR due_date IS NULL OR (return_date AT TIME ZONE 'UTC')::date <= (due_date AT TIME ZONE 'UTC')::date)) / NULLIF(COUNT(*) FILTER (WHERE status = 'RETURNED'), 0), 1), 0)::numeric AS on_time_rate, COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(return_date, CURRENT_DATE::timestamptz) - borrow_date)) / 86400.0), 1), 0)::numeric AS average_loan_days FROM borrow_records WHERE user_id = ${userId}`,
    ),
    db
      .select({
        status: borrowRecords.status,
        dueDate: borrowRecords.dueDate,
        fineAmount: borrowRecords.fineAmount,
        fineStatus: borrowRecords.fineStatus,
      })
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, userId),
          eq(borrowRecords.status, "BORROWED"),
          dueUtcBeforeTodaySql,
        ),
      ),
    db
      .select({ genre: books.genre, count: sql<number>`COUNT(*)::int` })
      .from(borrowRecords)
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(
        and(
          eq(borrowRecords.userId, userId),
          eq(borrowRecords.status, "RETURNED"),
        ),
      )
      .groupBy(books.genre)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(5),
    getDeterministicInsights(),
    loadSignupDecisionEntries(userId),
  ]);

  const signupDecisionActor: AdminRequestReviewer | null =
    userRow?.actorEmail && userRow?.actorFullName
      ? {
          id: userRow.actorId ?? null,
          fullName: userRow.actorFullName,
          email: userRow.actorEmail,
          universityCard: userRow.actorUniversityCard ?? null,
        }
      : null;

  const user = userRow
    ? {
        id: userRow.id,
        fullName: userRow.fullName,
        email: userRow.email,
        universityId: userRow.universityId,
        universityCard: userRow.universityCard,
        role: userRow.role,
        status: userRow.status,
        lastLogin: userRow.lastLogin,
        lastActivityDate: userRow.lastActivityDate,
        createdAt: userRow.createdAt,
        updatedAt: userRow.updatedAt,
        updatedBy: userRow.updatedBy,
        statusReviewedAt: userRow.statusReviewedAt ?? null,
        signupDecisionActor,
      }
    : undefined;

  const requestHistory: AdminPrivilegeHistoryEntry[] = requestHistoryRows.map(
    (row) => ({
      id: row.id,
      status: row.status,
      requestReason: row.requestReason,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt,
      reviewedAt: row.reviewedAt,
      reviewer:
        row.reviewerEmail && row.reviewerFullName
          ? ({
              id: row.reviewedBy ?? null,
              fullName: row.reviewerFullName,
              email: row.reviewerEmail,
              universityCard: row.reviewerUniversityCard ?? null,
            } satisfies AdminRequestReviewer)
          : null,
    }),
  );

  // Moderator join for User 360 Reviews Decision & Actor Status cell
  const reviewHistoryMapped = reviewHistory.map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
    bookId: row.bookId,
    bookTitle: row.bookTitle,
    bookAuthor: row.bookAuthor,
    bookCoverUrl: row.bookCoverUrl,
    bookCoverColor: row.bookCoverColor,
    bookGenre: row.bookGenre,
    bookRating: row.bookRating,
    reviewer:
      row.moderatorEmail && row.moderatorFullName
        ? ({
            id: row.reviewedBy ?? null,
            fullName: row.moderatorFullName,
            email: row.moderatorEmail,
            universityCard: row.moderatorUniversityCard ?? null,
          } satisfies AdminRequestReviewer)
        : null,
  }));

  // Soft UUID activity — delink CREATE/UPDATE when hard-deleted targets are gone.
  const activityHistoryAnnotated = await annotateMissingActivityEntities(
    activityHistory.map((row) => ({
      ...row,
      details: (row.details as Record<string, unknown> | null) ?? null,
    })),
  );

  const historyMapped = history.map((row) => {
    const { displayFineAmount } = computeDisplayFineForBorrowRow(
      {
        status: row.status,
        dueDate: row.dueDate,
        fineAmount: row.storedFineAmount,
        fineStatus: row.fineStatus,
      },
      dailyRate,
      rateHistory,
    );
    const { storedFineAmount: _stored, fineStatus: _status, ...rest } = row;
    return { ...rest, fineAmount: displayFineAmount };
  });

  const userOutstandingFine = userOverdueRows.reduce((sum, row) => {
    const { liveAmount } = computeDisplayFineForBorrowRow(
      {
        status: row.status,
        dueDate: row.dueDate,
        fineAmount: row.fineAmount,
        fineStatus: row.fineStatus,
      },
      dailyRate,
      rateHistory,
    );
    return sum + liveAmount;
  }, 0);

  const metricsRow: Record<string, string | number> = {
    ...(metrics.rows[0] as Record<string, string | number>),
    outstanding_fine: userOutstandingFine.toFixed(2),
  };

  return {
    user,
    history: historyMapped,
    reviewHistory: reviewHistoryMapped,
    requestHistory,
    reservationHistory,
    ticketHistory,
    activityHistory: activityHistoryAnnotated,
    /** Full user_status_decisions ledger — densify via signupRequestDetail. */
    signupDecisions: signupDecisions as SignupRequestDecisionEntry[],
    metrics: metricsRow,
    topGenres: genres,
    libraryInsights,
    pagination: {
      page: safePage,
      size: safeSize,
      total: Number(metricsRow.total ?? 0),
    },
  };
}
