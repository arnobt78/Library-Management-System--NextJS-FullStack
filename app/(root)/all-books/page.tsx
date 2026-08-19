import React from "react";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { books, borrowRecords } from "@/database/schema";
import { desc, asc, eq, ilike, and, or, sql } from "drizzle-orm";
import BookCollection from "@/components/BookCollection";
import type { BorrowRecord } from "@/lib/services/borrows";
import { mapSsrBorrowRecord } from "@/lib/borrows/mapSsrBorrowRecord";

interface SearchParams {
  search?: string;
  genre?: string;
  availability?: string;
  rating?: string;
  sort?: string;
  page?: string;
}

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="empty-panel">
        <p className="text-sm text-light-200 sm:text-base">
          Please sign in to view books.
        </p>
      </div>
    );
  }

  // Fetch user borrows for SSR (if user is logged in)
  // This ensures React Query cache is populated when users visit all-books page
  // When they navigate to book detail pages, the data is already cached
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
  }

  // Parse search parameters
  const params = await searchParams;
  // Trim so SSR matches client debounce; ilike = case-insensitive substring (API parity)
  const search = (params.search || "").trim();
  const genre = params.genre || "";
  const availability = params.availability || "";
  const rating = params.rating || "";
  const sort = params.sort || "title";
  const page = parseInt(params.page || "1");
  const booksPerPage = 12;

  // Build where conditions
  const whereConditions = [];

  // Search: title OR author, case-insensitive (matches /api/books ILIKE)
  if (search) {
    const searchPattern = `%${search}%`;
    whereConditions.push(
      or(
        ilike(books.title, searchPattern),
        ilike(books.author, searchPattern)
      )
    );
  }

  // Genre filter
  if (genre) {
    whereConditions.push(eq(books.genre, genre));
  }

  // Availability filter
  if (availability === "available") {
    whereConditions.push(sql`${books.availableCopies} > 0`);
  } else if (availability === "unavailable") {
    whereConditions.push(sql`${books.availableCopies} = 0`);
  }

  // Rating filter
  if (rating) {
    const minRating = parseInt(rating);
    whereConditions.push(sql`${books.rating} >= ${minRating}`);
  }

  // Build sort order
  let orderBy;
  switch (sort) {
    case "author":
      orderBy = asc(books.author);
      break;
    case "rating":
      orderBy = desc(books.rating);
      break;
    case "date":
      orderBy = desc(books.createdAt);
      break;
    case "title":
    default:
      orderBy = asc(books.title);
      break;
  }

  // Fetch books with pagination
  const offset = (page - 1) * booksPerPage;
  const allBooks = await db
    .select()
    .from(books)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(orderBy)
    .limit(booksPerPage)
    .offset(offset);

  // Filtered total for "Showing X of Y" pagination
  const totalBooksResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(books)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  const totalBooks = Number(totalBooksResult[0]?.count || 0);
  const totalPages = Math.ceil(totalBooks / booksPerPage);

  // Unfiltered DB total for the page subtitle (not affected by search/filters)
  const libraryTotalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(books);
  const libraryTotalBooks = Number(libraryTotalResult[0]?.count || 0);

  // Get unique genres for filter dropdown
  const genresResult = await db
    .selectDistinct({ genre: books.genre })
    .from(books)
    .orderBy(asc(books.genre));

  const genres = genresResult.map((g) => g.genre);

  return (
    <BookCollection
      initialBooks={allBooks}
      initialGenres={genres}
      initialSearchParams={{
        search,
        genre,
        availability,
        rating,
        sort,
        page,
      }}
      initialPagination={{
        currentPage: page,
        totalPages,
        totalBooks,
        booksPerPage,
      }}
      initialLibraryTotalBooks={libraryTotalBooks}
      initialUserBorrows={initialUserBorrows}
      currentUserId={session.user.id}
      accountStatus={
        (session.user as { status?: string }).status ?? "APPROVED"
      }
    />
  );
};

export default Page;
