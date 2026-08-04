// Parent: REQ-0029, REQ-0031

import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/database/drizzle";
import {
  adminRequests,
  bookReviews,
  books,
  borrowRecords,
  reservations,
  users,
} from "@/database/schema";
import { requireAdminActor } from "@/lib/auth/authorization";
import { getDeterministicInsights } from "@/lib/admin/actions/analytics";
import { parseProfilePagination } from "@/lib/actionInputs";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";

const signupDecisionUsers = alias(users, "profile_signup_decision_actor");
const adminRequestReviewerUsers = alias(users, "profile_admin_request_reviewer");

export async function getAdminUserProfile(userId: string, page = 1, size = 25) {
  await requireAdminActor();
  const { page: safePage, size: safeSize } = parseProfilePagination(page, size);
  const offset = (safePage - 1) * safeSize;

  const [
    userRow,
    history,
    reviewHistory,
    requestHistoryRows,
    reservationHistory,
    metrics,
    genres,
    libraryInsights,
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
        fineAmount: borrowRecords.fineAmount,
        renewalCount: borrowRecords.renewalCount,
        bookId: books.id,
        bookTitle: books.title,
        bookAuthor: books.author,
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
        createdAt: bookReviews.createdAt,
        bookId: books.id,
        bookTitle: books.title,
      })
      .from(bookReviews)
      .innerJoin(books, eq(bookReviews.bookId, books.id))
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
      })
      .from(reservations)
      .innerJoin(books, eq(reservations.bookId, books.id))
      .where(eq(reservations.userId, userId))
      .orderBy(desc(reservations.createdAt))
      .limit(25),
    db.execute(
      sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending, COUNT(*) FILTER (WHERE status = 'BORROWED')::int AS current, COUNT(*) FILTER (WHERE status = 'RETURNED')::int AS returned, COUNT(*) FILTER (WHERE status = 'BORROWED' AND due_date < CURRENT_DATE)::int AS overdue, COALESCE(SUM(fine_amount) FILTER (WHERE status = 'BORROWED'), 0)::numeric AS outstanding_fine, COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'RETURNED' AND (return_date IS NULL OR due_date IS NULL OR return_date <= due_date)) / NULLIF(COUNT(*) FILTER (WHERE status = 'RETURNED'), 0), 1), 0)::numeric AS on_time_rate, COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(return_date::timestamp, CURRENT_DATE::timestamp) - borrow_date)) / 86400.0), 1), 0)::numeric AS average_loan_days FROM borrow_records WHERE user_id = ${userId}`,
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

  const requestHistory = requestHistoryRows.map((row) => ({
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
  }));

  return {
    user,
    history,
    reviewHistory,
    requestHistory,
    reservationHistory,
    metrics: metrics.rows[0] as Record<string, string | number>,
    topGenres: genres,
    libraryInsights,
    pagination: {
      page: safePage,
      size: safeSize,
      total: Number(metrics.rows[0]?.total ?? 0),
    },
  };
}
