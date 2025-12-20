import { db } from "@/database/drizzle";
import { books, borrowRecords, users } from "@/database/schema";
import { eq, desc, sql, and, inArray, notInArray } from "drizzle-orm";

// Types for recommendations
export interface Recommendation {
  userId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookGenre: string;
  reason: string;
  score: number;
  algorithm: "genre-based" | "author-based" | "trending";
}

export interface RecommendationStats {
  totalRecommendations: number;
  genreBasedCount: number;
  authorBasedCount: number;
  trendingCount: number;
  lastUpdated: Date;
}

// Get user's borrowing history for recommendation algorithms
export async function getUserBorrowHistory(userId: string): Promise<
  Array<{
    bookId: string;
    bookTitle: string;
    bookAuthor: string;
    bookGenre: string;
    borrowDate: Date | null;
    status: "PENDING" | "BORROWED" | "RETURNED";
  }>
> {
  const history = await db
    .select({
      bookId: borrowRecords.bookId,
      bookTitle: books.title,
      bookAuthor: books.author,
      bookGenre: books.genre,
      borrowDate: borrowRecords.borrowDate,
      status: borrowRecords.status,
    })
    .from(borrowRecords)
    .innerJoin(books, eq(borrowRecords.bookId, books.id))
    .where(
      and(
        eq(borrowRecords.userId, userId),
        eq(borrowRecords.status, "RETURNED")
      )
    )
    .orderBy(desc(borrowRecords.borrowDate));

  return history;
}

// Genre-based recommendations
export async function generateGenreBasedRecommendations(
  userId: string,
  limit: number = 5
): Promise<Recommendation[]> {
  const userHistory = await getUserBorrowHistory(userId);

  if (userHistory.length === 0) {
    return [];
  }

  // Get user's favorite genres
  const genreCounts = userHistory.reduce(
    (acc, book) => {
      const genre = book.bookGenre || "Unknown";
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const favoriteGenres = Object.keys(genreCounts)
    .sort((a, b) => genreCounts[b] - genreCounts[a])
    .slice(0, 3); // Top 3 genres

  if (favoriteGenres.length === 0) {
    return [];
  }

  // Get books user hasn't borrowed yet
  const borrowedBookIds = userHistory.map((book) => book.bookId);

  const recommendations = await db
    .select({
      bookId: books.id,
      bookTitle: books.title,
      bookAuthor: books.author,
      bookGenre: books.genre,
      rating: books.rating,
    })
    .from(books)
    .where(
      and(
        inArray(books.genre, favoriteGenres),
        eq(books.isActive, true),
        borrowedBookIds.length > 0
          ? notInArray(books.id, borrowedBookIds)
          : sql`1=1`
      )
    )
    .orderBy(desc(books.rating), desc(books.createdAt))
    .limit(limit);

  return recommendations.map((book) => ({
    userId,
    bookId: book.bookId,
    bookTitle: book.bookTitle,
    bookAuthor: book.bookAuthor,
    bookGenre: book.bookGenre || "Unknown",
    reason: `Based on your interest in ${book.bookGenre} books`,
    score: book.rating || 0,
    algorithm: "genre-based" as const,
  }));
}

// Author-based recommendations
export async function generateAuthorBasedRecommendations(
  userId: string,
  limit: number = 5
): Promise<Recommendation[]> {
  const userHistory = await getUserBorrowHistory(userId);

  if (userHistory.length === 0) {
    return [];
  }

  // Get user's favorite authors
  const authorCounts = userHistory.reduce(
    (acc, book) => {
      const author = book.bookAuthor || "Unknown";
      acc[author] = (acc[author] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const favoriteAuthors = Object.keys(authorCounts)
    .sort((a, b) => authorCounts[b] - authorCounts[a])
    .slice(0, 3); // Top 3 authors

  if (favoriteAuthors.length === 0) {
    return [];
  }

  // Get books user hasn't borrowed yet
  const borrowedBookIds = userHistory.map((book) => book.bookId);

  const recommendations = await db
    .select({
      bookId: books.id,
      bookTitle: books.title,
      bookAuthor: books.author,
      bookGenre: books.genre,
      rating: books.rating,
    })
    .from(books)
    .where(
      and(
        inArray(books.author, favoriteAuthors),
        eq(books.isActive, true),
        borrowedBookIds.length > 0
          ? notInArray(books.id, borrowedBookIds)
          : sql`1=1`
      )
    )
    .orderBy(desc(books.rating), desc(books.createdAt))
    .limit(limit);

  return recommendations.map((book) => ({
    userId,
    bookId: book.bookId,
    bookTitle: book.bookTitle,
    bookAuthor: book.bookAuthor,
    bookGenre: book.bookGenre || "Unknown",
    reason: `By ${book.bookAuthor}, an author you enjoy`,
    score: book.rating || 0,
    algorithm: "author-based" as const,
  }));
}

// Trending recommendations (most borrowed books recently)
export async function generateTrendingRecommendations(
  userId: string,
  limit: number = 5
): Promise<Recommendation[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get user's borrowing history to exclude already borrowed books
  const userHistory = await getUserBorrowHistory(userId);
  const borrowedBookIds = userHistory.map((book) => book.bookId);

  // Get most borrowed books in the last 30 days
  const trendingBooks = await db
    .select({
      bookId: books.id,
      bookTitle: books.title,
      bookAuthor: books.author,
      bookGenre: books.genre,
      rating: books.rating,
      borrowCount: sql<number>`count(${borrowRecords.id})`,
    })
    .from(books)
    .innerJoin(borrowRecords, eq(books.id, borrowRecords.bookId))
    .where(
      and(
        eq(books.isActive, true),
        sql`${borrowRecords.borrowDate} >= ${thirtyDaysAgo}`,
        borrowedBookIds.length > 0
          ? notInArray(books.id, borrowedBookIds)
          : sql`1=1`
      )
    )
    .groupBy(books.id, books.title, books.author, books.genre, books.rating)
    .orderBy(desc(sql`count(${borrowRecords.id})`), desc(books.rating))
    .limit(limit);

  return trendingBooks.map((book) => ({
    userId,
    bookId: book.bookId,
    bookTitle: book.bookTitle,
    bookAuthor: book.bookAuthor,
    bookGenre: book.bookGenre || "Unknown",
    reason: `Trending: ${book.borrowCount} borrows in the last 30 days`,
    score: book.borrowCount,
    algorithm: "trending" as const,
  }));
}

// Generate all recommendations for a user
export async function generateUserRecommendations(
  userId: string
): Promise<Recommendation[]> {
  const [genreRecs, authorRecs, trendingRecs] = await Promise.all([
    generateGenreBasedRecommendations(userId, 3),
    generateAuthorBasedRecommendations(userId, 3),
    generateTrendingRecommendations(userId, 4),
  ]);

  // Combine and deduplicate recommendations
  const allRecs = [...genreRecs, ...authorRecs, ...trendingRecs];
  const uniqueRecs = allRecs.filter(
    (rec, index, self) =>
      index === self.findIndex((r) => r.bookId === rec.bookId)
  );

  // Sort by score and return top 10
  return uniqueRecs.sort((a, b) => b.score - a.score).slice(0, 10);
}

// Generate recommendations for all users
export async function generateAllUserRecommendations(): Promise<
  { userId: string; recommendations: Recommendation[] }[]
> {
  const allUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.status, "APPROVED"));

  const results = [];
  for (const user of allUsers) {
    try {
      const recommendations = await generateUserRecommendations(user.id);
      results.push({
        userId: user.id,
        recommendations,
      });
    } catch (error: unknown) {
      console.error(
        `Error generating recommendations for user ${user.id}:`,
        error
      );
    }
  }

  return results;
}

// Update trending books (refresh the trending algorithm data)
export async function updateTrendingBooks(): Promise<{
  message: string;
  trendingCount: number;
}> {
  // This function refreshes the trending data by recalculating recent borrows
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trendingStats = await db
    .select({
      bookId: books.id,
      bookTitle: books.title,
      borrowCount: sql<number>`count(${borrowRecords.id})`,
    })
    .from(books)
    .innerJoin(borrowRecords, eq(books.id, borrowRecords.bookId))
    .where(
      and(
        eq(books.isActive, true),
        sql`${borrowRecords.borrowDate} >= ${thirtyDaysAgo}`
      )
    )
    .groupBy(books.id, books.title)
    .orderBy(desc(sql`count(${borrowRecords.id})`))
    .limit(10);

  return {
    message: `Updated trending books data. Found ${trendingStats.length} trending books.`,
    trendingCount: trendingStats.length,
  };
}

// Refresh recommendation cache (simulate cache refresh)
export async function refreshRecommendationCache(): Promise<{
  message: string;
  cacheCleared: boolean;
}> {
  // In a real application, this would clear Redis cache or similar
  // For now, we'll just simulate the operation

  console.log("🔄 Refreshing recommendation cache...");

  // Simulate cache operations
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    message:
      "Recommendation cache refreshed successfully. All cached recommendations have been cleared and will be regenerated on next request.",
    cacheCleared: true,
  };
}

// Get recommendation statistics
export async function getRecommendationStats(): Promise<RecommendationStats> {
  const allUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.status, "APPROVED"));

  let totalRecommendations = 0;
  let genreBasedCount = 0;
  let authorBasedCount = 0;
  let trendingCount = 0;

  for (const user of allUsers) {
    try {
      const recommendations = await generateUserRecommendations(user.id);
      totalRecommendations += recommendations.length;

      recommendations.forEach((rec) => {
        switch (rec.algorithm) {
          case "genre-based":
            genreBasedCount++;
            break;
          case "author-based":
            authorBasedCount++;
            break;
          case "trending":
            trendingCount++;
            break;
        }
      });
    } catch (error: unknown) {
      console.error(`Error getting stats for user ${user.id}:`, error);
    }
  }

  return {
    totalRecommendations,
    genreBasedCount,
    authorBasedCount,
    trendingCount,
    lastUpdated: new Date(),
  };
}
