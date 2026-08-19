import HomeFeaturedHero from "@/components/HomeFeaturedHero";
import HomeRecommendations from "@/components/HomeRecommendations";
import PerformanceWrapper from "@/components/PerformanceWrapper";
import AuthToastBridge from "@/components/AuthToastBridge";
import { db } from "@/database/drizzle";
import { books, users, borrowRecords } from "@/database/schema";
import { auth } from "@/auth";
import { count, desc, eq, sql, and, inArray, notInArray } from "drizzle-orm";
import type { BorrowRecord } from "@/lib/services/borrows";
import type { UserReservationItem } from "@/lib/services/reservations";
import { getHomepageHeroBook } from "@/lib/admin/actions/book";
import { loadUserReservationsSsr } from "@/lib/circulation/loadUserReservationsSsr";
import { mapSsrBorrowRecord } from "@/lib/borrows/mapSsrBorrowRecord";

const Home = async () => {
  const session = await auth();

  // Curated featured book when set; otherwise newest active (never auto-steal via create alone)
  const heroBook = await getHomepageHeroBook();

  // Fetch user borrows for SSR (if user is logged in)
  // This ensures BookBorrowButton shows correct state immediately on first load
  let initialUserBorrows: BorrowRecord[] | undefined = undefined;
  let initialReservations: UserReservationItem[] | undefined = undefined;
  let userStatus: string | null = null;

  if (session?.user?.id) {
    const [userRow] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    userStatus = userRow?.status ?? null;

    // Fetch user's borrow records (matching API response format)
    const userBorrowRecords = await db
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
        borrowedBy: borrowRecords.borrowedBy,
        returnedBy: borrowRecords.returnedBy,
        fineAmount: borrowRecords.fineAmount,
        notes: borrowRecords.notes,
        renewalCount: borrowRecords.renewalCount,
        lastReminderSent: borrowRecords.lastReminderSent,
        updatedAt: borrowRecords.updatedAt,
        updatedBy: borrowRecords.updatedBy,
        createdAt: borrowRecords.createdAt,
      })
      .from(borrowRecords)
      .where(eq(borrowRecords.userId, session.user.id))
      .orderBy(desc(borrowRecords.createdAt));

    initialUserBorrows = userBorrowRecords.map(mapSsrBorrowRecord);

    // Waitlisted CTA densify seed — same key as book detail / Holds
    initialReservations = await loadUserReservationsSsr(session.user.id);
  }

  // SSR borrow stats for the hero book (zero duplicate fetch on first paint)
  let heroInitialStats:
    | {
        totalBorrows: number;
        activeBorrows: number;
        returnedBorrows: number;
      }
    | undefined;

  if (heroBook) {
    const borrowStatsResult = await db
      .select({
        totalBorrows: count(),
        activeBorrows: sql<number>`count(case when ${borrowRecords.status} = 'BORROWED' then 1 end)`,
        returnedBorrows: sql<number>`count(case when ${borrowRecords.status} = 'RETURNED' then 1 end)`,
      })
      .from(borrowRecords)
      .where(eq(borrowRecords.bookId, heroBook.id));

    const stats = borrowStatsResult[0] || {
      totalBorrows: 0,
      activeBorrows: 0,
      returnedBorrows: 0,
    };

    heroInitialStats = {
      totalBorrows: Number(stats.totalBorrows) || 0,
      activeBorrows: Number(stats.activeBorrows) || 0,
      returnedBorrows: Number(stats.returnedBorrows) || 0,
    };
  }

  // Get book recommendations based on reading history
  let recommendedBooks: Book[] = [];

  if (session?.user?.id) {
    // Try to get recommendations based on user's reading history
    const userBorrowHistory = await db
      .select({
        genre: books.genre,
        author: books.author,
      })
      .from(borrowRecords)
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(
        and(
          eq(borrowRecords.userId, session.user.id),
          eq(borrowRecords.status, "RETURNED")
        )
      )
      .limit(10);

    if (userBorrowHistory.length > 0) {
      // Get books from similar genres/authors that user hasn't borrowed
      const userBorrowedBookIds = await db
        .select({ bookId: borrowRecords.bookId })
        .from(borrowRecords)
        .where(eq(borrowRecords.userId, session.user.id));

      const borrowedIds = userBorrowedBookIds.map((record) => record.bookId);

      // Get unique genres from user's reading history
      const userGenres = [...new Set(userBorrowHistory.map((h) => h.genre))];

      // Get recommended books based on reading history
      const genreRecommendations = await db
        .select()
        .from(books)
        .where(
          and(
            inArray(books.genre, userGenres),
            borrowedIds.length > 0
              ? notInArray(books.id, borrowedIds)
              : sql`1=1`,
            eq(books.isActive, true)
          )
        )
        .orderBy(desc(books.rating), desc(books.createdAt))
        .limit(6);

      recommendedBooks = genreRecommendations as Book[];

      // If we don't have enough recommendations from genres, fill with other high-rated books
      if (recommendedBooks.length < 6) {
        const additionalBooks = await db
          .select()
          .from(books)
          .where(
            and(
              borrowedIds.length > 0
                ? notInArray(books.id, borrowedIds)
                : sql`1=1`,
              eq(books.isActive, true)
            )
          )
          .orderBy(desc(books.rating), desc(books.createdAt))
          .limit(6);

        // Filter out books already in recommendations and add unique ones
        const existingIds = recommendedBooks.map((book) => book.id);
        const uniqueAdditionalBooks = additionalBooks.filter(
          (book) => !existingIds.includes(book.id)
        );

        recommendedBooks = [
          ...recommendedBooks,
          ...uniqueAdditionalBooks,
        ].slice(0, 6);
      }
    }
  }

  // If no recommendations from history, get latest high-rated books
  if (recommendedBooks.length === 0) {
    recommendedBooks = (await db
      .select()
      .from(books)
      .where(eq(books.isActive, true))
      .orderBy(desc(books.rating), desc(books.createdAt))
      .limit(6)) as Book[];
  }

  // Serialize hero for client boundary (Dates → JSON-safe)
  const initialHero = heroBook
    ? (JSON.parse(JSON.stringify(heroBook)) as Book)
    : null;

  return (
    <PerformanceWrapper pageName="home">
      {/* Deferred welcome/signup toast after auth navigation */}
      <AuthToastBridge kinds={["welcome", "signup"]} />
      <HomeFeaturedHero
        initialHero={initialHero}
        userId={session?.user?.id}
        userStatus={userStatus}
        initialUserBorrows={initialUserBorrows}
        initialReservations={initialReservations}
        initialStats={heroInitialStats}
      />

      {/* Book Recommendations with React Query */}
      <HomeRecommendations
        initialRecommendations={recommendedBooks}
        userId={session?.user?.id}
        limit={6}
      />
    </PerformanceWrapper>
  );
};

export default Home;
