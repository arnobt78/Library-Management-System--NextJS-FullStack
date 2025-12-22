import BookList from "@/components/BookList";
import BookOverview from "@/components/BookOverview";
import HomeRecommendations from "@/components/HomeRecommendations";
import PerformanceWrapper from "@/components/PerformanceWrapper";
import { db } from "@/database/drizzle";
import { books, users, borrowRecords } from "@/database/schema";
import { auth } from "@/auth";
import { desc, eq, sql, and, inArray, notInArray } from "drizzle-orm";

const Home = async () => {
  const session = await auth();

  // Get the latest book for the hero section
  const latestBooks = (await db
    .select()
    .from(books)
    .orderBy(desc(books.createdAt))) as Book[];

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
      <BookOverview {...latestBooks[0]} userId={session?.user?.id as string} />

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
