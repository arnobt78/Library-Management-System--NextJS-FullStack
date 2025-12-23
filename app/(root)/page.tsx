import BookOverview from "@/components/BookOverview";
import HomeRecommendations from "@/components/HomeRecommendations";
import PerformanceWrapper from "@/components/PerformanceWrapper";
import { db } from "@/database/drizzle";
import { books, users, borrowRecords } from "@/database/schema";
import { auth } from "@/auth";
import { desc, eq, sql, and, inArray, notInArray } from "drizzle-orm";
import type { BorrowRecord } from "@/lib/services/borrows";

const Home = async () => {
  const session = await auth();

  // Get the latest book for the hero section
  const latestBooks = (await db
    .select()
    .from(books)
    .orderBy(desc(books.createdAt))) as Book[];

  // Fetch user borrows for SSR (if user is logged in)
  // This ensures BookBorrowButton shows correct state immediately on first load
  let initialUserBorrows: BorrowRecord[] | undefined = undefined;

  if (session?.user?.id) {
    // Fetch user's borrow records (matching API response format)
    const userBorrowRecords = await db
      .select({
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
      })
      .from(borrowRecords)
      .where(eq(borrowRecords.userId, session.user.id))
      .orderBy(desc(borrowRecords.createdAt));

    // Transform to match BorrowRecord type
    // Drizzle's date() type returns strings (YYYY-MM-DD), timestamp() returns Date objects
    // BorrowRecord expects: borrowDate as Date, dueDate/returnDate as string, fineAmount as string
    initialUserBorrows = userBorrowRecords.map((record) => {
      // Handle dueDate: Drizzle date() returns string (YYYY-MM-DD format)
      const dueDateValue = record.dueDate as string | Date | null;
      let dueDateStr: string | null = null;
      if (dueDateValue) {
        if (typeof dueDateValue === "string") {
          dueDateStr = dueDateValue;
        } else {
          dueDateStr = dueDateValue.toISOString().split("T")[0];
        }
      }

      // Handle returnDate: Drizzle date() returns string (YYYY-MM-DD format)
      const returnDateValue = record.returnDate as string | Date | null;
      let returnDateStr: string | null = null;
      if (returnDateValue) {
        if (typeof returnDateValue === "string") {
          returnDateStr = returnDateValue;
        } else {
          returnDateStr = returnDateValue.toISOString().split("T")[0];
        }
      }

      return {
        id: record.id,
        userId: record.userId,
        bookId: record.bookId,
        borrowDate: record.borrowDate, // timestamp() returns Date object
        dueDate: dueDateStr,
        returnDate: returnDateStr,
        status: record.status as "PENDING" | "BORROWED" | "RETURNED",
        borrowedBy: record.borrowedBy,
        returnedBy: record.returnedBy,
        fineAmount: record.fineAmount || "0.00",
        notes: record.notes,
        renewalCount: record.renewalCount,
        lastReminderSent: record.lastReminderSent, // timestamp() returns Date object
        updatedAt: record.updatedAt, // timestamp() returns Date object
        updatedBy: record.updatedBy,
        createdAt: record.createdAt, // timestamp() returns Date object
      };
    });
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

  return (
    <PerformanceWrapper pageName="home">
      <BookOverview
        {...latestBooks[0]}
        userId={session?.user?.id as string}
        initialUserBorrows={initialUserBorrows}
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
