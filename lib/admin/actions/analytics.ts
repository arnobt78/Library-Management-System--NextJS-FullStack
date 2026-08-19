import { db } from "@/database/drizzle";
import {
  books,
  users,
  borrowRecords,
  reservations,
  supportTickets,
  bookReviews,
} from "@/database/schema";
import { eq, sql, desc, and, gte, count, inArray } from "drizzle-orm";
import type { AnalyticsData } from "@/lib/services/analytics";
import type { DeterministicInsights } from "@/lib/insights/types";
import {
  computeFineForecast,
  computeGenreDemandPressure,
  normalizeOverdueTrend,
  safePercentage,
  safeRatio,
} from "@/lib/insights/formulas";
import { getDailyFineAmount } from "@/lib/admin/actions/config";
import { getFineRateHistory } from "@/lib/fines/rateHistory";
import { computeDisplayFineForBorrowRow } from "@/lib/fines/mapDisplayFine";

function boundedInteger(value: number | undefined, fallback: number, maximum: number) {
  return Number.isFinite(value)
    ? Math.min(maximum, Math.max(1, Math.trunc(value as number)))
    : fallback;
}

// Get borrowing trends over time (last 30 days)
export async function getBorrowingTrends(days = 30) {
  const safeDays = boundedInteger(days, 30, 90);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - safeDays);

  const trends = await db
    .select({
      date: sql<string>`DATE(${borrowRecords.createdAt})`,
      borrows: count(),
      returns: sql<number>`count(case when ${borrowRecords.status} = 'RETURNED' then 1 end)`,
    })
    .from(borrowRecords)
    .where(gte(borrowRecords.createdAt, thirtyDaysAgo))
    .groupBy(sql`DATE(${borrowRecords.createdAt})`)
    .orderBy(sql`DATE(${borrowRecords.createdAt})`);

  return trends;
}

// Get most popular books/genres
export async function getPopularBooks(limit = 10) {
  const popularBooks = await db
    .select({
      bookId: borrowRecords.bookId,
      bookTitle: books.title,
      bookAuthor: books.author,
      bookGenre: books.genre,
      totalBorrows: count(),
      activeBorrows: sql<number>`count(case when ${borrowRecords.status} = 'BORROWED' then 1 end)`,
      returnedBorrows: sql<number>`count(case when ${borrowRecords.status} = 'RETURNED' then 1 end)`,
    })
    .from(borrowRecords)
    .innerJoin(books, eq(borrowRecords.bookId, books.id))
    .groupBy(borrowRecords.bookId, books.title, books.author, books.genre)
    .orderBy(desc(count()))
    .limit(limit);

  return popularBooks;
}

export async function getPopularGenres(limit = 10) {
  const safeLimit = boundedInteger(limit, 10, 25);
  const popularGenres = await db
    .select({
      genre: books.genre,
      totalBorrows: count(),
      uniqueBooks: sql<number>`count(distinct ${borrowRecords.bookId})`,
    })
    .from(borrowRecords)
    .innerJoin(books, eq(borrowRecords.bookId, books.id))
    .groupBy(books.genre)
    .orderBy(desc(count()))
    .limit(safeLimit);

  return popularGenres;
}

// Get user activity patterns
export async function getUserActivityPatterns(limit = 20) {
  const safeLimit = boundedInteger(limit, 20, 50);
  const userActivity = await db
    .select({
      userId: borrowRecords.userId,
      userName: users.fullName,
      userEmail: users.email,
      totalBorrows: count(),
      activeBorrows: sql<number>`count(case when ${borrowRecords.status} = 'BORROWED' then 1 end)`,
      returnedBorrows: sql<number>`count(case when ${borrowRecords.status} = 'RETURNED' then 1 end)`,
      pendingBorrows: sql<number>`count(case when ${borrowRecords.status} = 'PENDING' then 1 end)`,
      lastActivity: sql<Date>`max(${borrowRecords.createdAt})`,
    })
    .from(borrowRecords)
    .innerJoin(users, eq(borrowRecords.userId, users.id))
    .groupBy(borrowRecords.userId, users.fullName, users.email)
    .orderBy(desc(count()))
    .limit(safeLimit);

  return userActivity;
}

// Get overdue book analysis
export async function getOverdueAnalysis() {
  const now = new Date();

  const [dailyFineAmount, rateHistory] = await Promise.all([
    getDailyFineAmount(),
    getFineRateHistory(),
  ]);

  const overdueBooks = await db
    .select({
      recordId: borrowRecords.id,
      bookId: borrowRecords.bookId,
      userId: borrowRecords.userId,
      bookTitle: books.title,
      bookAuthor: books.author,
      bookCoverUrl: books.coverUrl,
      bookCoverColor: books.coverColor,
      bookGenre: books.genre,
      bookRating: books.rating,
      bookAvailableCopies: books.availableCopies,
      bookTotalCopies: books.totalCopies,
      userName: users.fullName,
      userEmail: users.email,
      userUniversityId: users.universityId,
      userUniversityCard: users.universityCard,
      borrowDate: borrowRecords.borrowDate,
      dueDate: borrowRecords.dueDate,
      status: borrowRecords.status,
      storedFineAmount: borrowRecords.fineAmount,
      fineStatus: borrowRecords.fineStatus,
      daysOverdue: sql<number>`CASE 
        WHEN ${borrowRecords.dueDate} IS NOT NULL 
        THEN (CURRENT_DATE - ${borrowRecords.dueDate}::date)
        ELSE 0 
      END`,
    })
    .from(borrowRecords)
    .innerJoin(books, eq(borrowRecords.bookId, books.id))
    .innerJoin(users, eq(borrowRecords.userId, users.id))
    .where(
      and(
        eq(borrowRecords.status, "BORROWED"),
        sql`${borrowRecords.dueDate} < CURRENT_DATE`
      )
    )
    .orderBy(sql`(CURRENT_DATE - ${borrowRecords.dueDate}::date) DESC`);

  return overdueBooks.map((row) => {
    const { displayFineAmount } = computeDisplayFineForBorrowRow(
      {
        status: row.status,
        dueDate: row.dueDate,
        fineAmount: row.storedFineAmount,
        fineStatus: row.fineStatus,
      },
      dailyFineAmount,
      rateHistory,
      now,
    );
    return {
      recordId: row.recordId,
      bookId: row.bookId,
      userId: row.userId,
      bookTitle: row.bookTitle,
      bookAuthor: row.bookAuthor,
      bookCoverUrl: row.bookCoverUrl,
      bookCoverColor: row.bookCoverColor,
      bookGenre: row.bookGenre,
      bookRating: row.bookRating,
      bookAvailableCopies: row.bookAvailableCopies,
      bookTotalCopies: row.bookTotalCopies,
      userName: row.userName,
      userEmail: row.userEmail,
      userUniversityId: row.userUniversityId,
      userUniversityCard: row.userUniversityCard,
      borrowDate: row.borrowDate,
      dueDate: row.dueDate,
      daysOverdue: Number(row.daysOverdue) || 0,
      fineAmount: displayFineAmount,
    };
  });
}

// Get overdue statistics
export async function getOverdueStats() {
  const overdueBooks = await getOverdueAnalysis();
  const totalOverdue = overdueBooks.length;
  const totalFines = overdueBooks.reduce(
    (sum, row) => sum + Number.parseFloat(row.fineAmount || "0"),
    0,
  );
  const avgDaysOverdue =
    totalOverdue > 0
      ? overdueBooks.reduce((sum, row) => sum + Number(row.daysOverdue || 0), 0) /
        totalOverdue
      : 0;

  return {
    totalOverdue,
    totalFines,
    avgDaysOverdue,
  };
}

// Get monthly borrowing statistics (last 12 calendar months, zero-filled)
export async function getMonthlyStats() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${borrowRecords.createdAt}), 'YYYY-MM')`,
      borrows: count(),
    })
    .from(borrowRecords)
    .where(gte(borrowRecords.createdAt, start))
    .groupBy(sql`date_trunc('month', ${borrowRecords.createdAt})`)
    .orderBy(sql`date_trunc('month', ${borrowRecords.createdAt})`);

  const byMonth = new Map(
    rows.map((r) => [r.month, Number(r.borrows) || 0] as const),
  );

  const months: Array<{ month: string; borrows: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month: key, borrows: byMonth.get(key) ?? 0 });
  }

  const currentMonth = months[months.length - 1] ?? { month: "", borrows: 0 };
  const lastMonth = months[months.length - 2] ?? { month: "", borrows: 0 };

  return { months, currentMonth, lastMonth };
}

// Get system health metrics
export async function getSystemHealth() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get individual metrics
  const [
    totalBooksResult,
    totalUsersResult,
    activeBorrowsResult,
    pendingRequestsResult,
    overdueBooksResult,
    dueSoon48hResult,
    holdsWaitingResult,
    openTicketsResult,
    pendingReviewsResult,
    recentActivityResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(books),
    db.select({ count: count() }).from(users),
    db
      .select({ count: count() })
      .from(borrowRecords)
      .where(eq(borrowRecords.status, "BORROWED")),
    db
      .select({ count: count() })
      .from(borrowRecords)
      .where(eq(borrowRecords.status, "PENDING")),
    db
      .select({ count: count() })
      .from(borrowRecords)
      .where(
        and(
          sql`${borrowRecords.dueDate} < CURRENT_DATE`,
          eq(borrowRecords.status, "BORROWED")
        )
      ),
    db
      .select({ count: count() })
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.status, "BORROWED"),
          sql`${borrowRecords.dueDate} >= CURRENT_DATE`,
          sql`${borrowRecords.dueDate} <= CURRENT_DATE + INTERVAL '2 days'`,
        )
      ),
    db
      .select({ count: count() })
      .from(reservations)
      .where(eq(reservations.status, "WAITING")),
    db
      .select({ count: count() })
      .from(supportTickets)
      .where(inArray(supportTickets.status, ["OPEN", "IN_PROGRESS"])),
    db
      .select({ count: count() })
      .from(bookReviews)
      .where(eq(bookReviews.status, "PENDING")),
    db
      .select({ count: count() })
      .from(borrowRecords)
      .where(gte(borrowRecords.createdAt, sevenDaysAgo)),
  ]);

  return {
    totalBooks: totalBooksResult[0]?.count || 0,
    totalUsers: totalUsersResult[0]?.count || 0,
    activeBorrows: activeBorrowsResult[0]?.count || 0,
    pendingRequests: pendingRequestsResult[0]?.count || 0,
    overdueBooks: overdueBooksResult[0]?.count || 0,
    dueSoon48h: dueSoon48hResult[0]?.count || 0,
    holdsWaiting: holdsWaitingResult[0]?.count || 0,
    openTickets: openTicketsResult[0]?.count || 0,
    pendingReviews: pendingReviewsResult[0]?.count || 0,
    recentActivity: recentActivityResult[0]?.count || 0,
  };
}

/** Versioned formulas keep insight output reproducible and provider-independent (C2-v2). */
export async function getDeterministicInsights(): Promise<DeterministicInsights> {
  const dailyRate = await getDailyFineAmount();

  const [result, trendResult, genreResult, overdueBooks] = await Promise.all([
    db.execute(sql`
    WITH circulation AS (
      SELECT
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '29 days')::int AS recent,
        COUNT(*) FILTER (WHERE status = 'RETURNED')::int AS returned,
        COUNT(*) FILTER (WHERE status = 'RETURNED' AND (return_date IS NULL OR due_date IS NULL OR return_date <= due_date))::int AS on_time,
        COUNT(*) FILTER (WHERE status = 'BORROWED')::int AS active,
        COUNT(*) FILTER (WHERE status = 'BORROWED' AND due_date < CURRENT_DATE)::int AS overdue,
        COUNT(*) FILTER (WHERE renewal_count > 0)::int AS renewed,
        COUNT(*)::int AS total
      FROM borrow_records
    ), inventory AS (
      SELECT COALESCE(SUM(total_copies), 0)::numeric AS copies FROM books WHERE is_active = true
    ), holds AS (
      SELECT COUNT(*) FILTER (WHERE status IN ('WAITING', 'READY'))::numeric AS active FROM reservations
    )
    SELECT
      (CURRENT_DATE - INTERVAL '29 days')::date::text AS period_start,
      CURRENT_DATE::text AS period_end,
      circulation.recent,
      circulation.on_time,
      circulation.returned,
      circulation.active,
      circulation.overdue,
      circulation.renewed,
      circulation.total,
      inventory.copies,
      holds.active AS active_holds
    FROM circulation, inventory, holds
  `),
    db.execute(sql`
    SELECT
      d.day::date::text AS date,
      COUNT(br.id)::int AS overdue_count
    FROM generate_series(
      CURRENT_DATE - INTERVAL '13 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    ) AS d(day)
    LEFT JOIN borrow_records br ON
      br.due_date IS NOT NULL
      AND br.due_date < d.day::date
      AND COALESCE(br.borrow_date, br.created_at)::date <= d.day::date
      AND (br.return_date IS NULL OR br.return_date::date > d.day::date)
    GROUP BY d.day
    ORDER BY d.day
  `),
    db.execute(sql`
    WITH book_borrows AS (
      SELECT book_id, COUNT(*)::int AS borrows
      FROM borrow_records
      WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY book_id
    )
    SELECT
      b.genre AS genre,
      COALESCE(SUM(bb.borrows), 0)::int AS borrows,
      COALESCE(SUM(b.total_copies), 0)::int AS copies
    FROM books b
    LEFT JOIN book_borrows bb ON bb.book_id = b.id
    WHERE b.is_active = true
    GROUP BY b.genre
    ORDER BY COALESCE(SUM(bb.borrows), 0) DESC, b.genre ASC
    LIMIT 8
  `),
    getOverdueAnalysis(),
  ]);

  const row = result.rows[0];
  const overdueCount = Number(row?.overdue ?? 0);
  const outstanding = overdueBooks.reduce(
    (sum, book) => sum + Number.parseFloat(book.fineAmount || "0"),
    0,
  );

  const overdueTrend = normalizeOverdueTrend(
    (trendResult.rows as { date?: string; overdue_count?: number }[]).map(
      (r) => ({
        date: String(r.date ?? ""),
        overdueCount: Number(r.overdue_count ?? 0),
      }),
    ),
  );

  const genreDemandPressure = computeGenreDemandPressure(
    (
      genreResult.rows as {
        genre?: string;
        borrows?: number;
        copies?: number;
      }[]
    ).map((r) => ({
      genre: String(r.genre ?? "Unknown"),
      borrows: Number(r.borrows ?? 0),
      copies: Number(r.copies ?? 0),
    })),
  );

  return {
    formulaVersion: "C2-v2",
    periodStart: String(row?.period_start ?? ""),
    periodEnd: String(row?.period_end ?? ""),
    circulation30Days: Number(row?.recent ?? 0),
    onTimeReturnRate: safePercentage(
      Number(row?.on_time ?? 0),
      Number(row?.returned ?? 0),
    ),
    overdueRatio: safePercentage(overdueCount, Number(row?.active ?? 0)),
    outstandingFineTotal: outstanding,
    demandToCopyRatio: safeRatio(
      Number(row?.recent ?? 0) + Number(row?.active_holds ?? 0),
      Number(row?.copies ?? 0),
    ),
    holdPressure: safeRatio(
      Number(row?.active_holds ?? 0),
      Number(row?.copies ?? 0),
    ),
    renewalRate: safePercentage(
      Number(row?.renewed ?? 0),
      Number(row?.total ?? 0),
    ),
    overdueTrend,
    fineForecast: computeFineForecast({
      outstanding,
      overdueLoanCount: overdueCount,
      dailyRate: dailyRate,
      horizonDays: 7,
    }),
    genreDemandPressure,
  };
}

export async function getCompleteAnalyticsSnapshot(options?: {
  popularBooksLimit?: number;
  popularGenresLimit?: number;
  userActivityLimit?: number;
  borrowingTrendsDays?: number;
}): Promise<AnalyticsData> {
  const booksLimit = boundedInteger(options?.popularBooksLimit, 10, 25);
  const genresLimit = boundedInteger(options?.popularGenresLimit, 10, 25);
  const usersLimit = boundedInteger(options?.userActivityLimit, 20, 50);
  const trendsDays = boundedInteger(options?.borrowingTrendsDays, 30, 90);
  const [borrowingTrends, popularBooks, popularGenres, userActivity, overdueBooks, overdueStats, monthlyStats, systemHealth, deterministicInsights] =
    await Promise.all([
      getBorrowingTrends(trendsDays),
      getPopularBooks(booksLimit),
      getPopularGenres(genresLimit),
      getUserActivityPatterns(usersLimit),
      getOverdueAnalysis(),
      getOverdueStats(),
      getMonthlyStats(),
      getSystemHealth(),
      getDeterministicInsights(),
    ]);
  return { borrowingTrends, popularBooks, popularGenres, userActivity, overdueBooks, overdueStats, monthlyStats, systemHealth, deterministicInsights };
}
