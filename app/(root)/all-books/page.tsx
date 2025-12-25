import React from "react";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { books, borrowRecords } from "@/database/schema";
import { desc, asc, eq, like, and, or, sql } from "drizzle-orm";
import BookCollection from "@/components/BookCollection";
import type { BorrowRecord } from "@/lib/services/borrows";

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
      <div className="px-3 py-4 text-center sm:px-4 sm:py-6">
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

  // Parse search parameters
  const params = await searchParams;
  const search = params.search || "";
  const genre = params.genre || "";
  const availability = params.availability || "";
  const rating = params.rating || "";
  const sort = params.sort || "title";
  const page = parseInt(params.page || "1");
  const booksPerPage = 12;

  // Build where conditions
  const whereConditions = [];

  // Search condition
  if (search) {
    whereConditions.push(
      or(like(books.title, `%${search}%`), like(books.author, `%${search}%`))
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

  // Get total count for pagination
  const totalBooksResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(books)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  const totalBooks = totalBooksResult[0]?.count || 0;
  const totalPages = Math.ceil(totalBooks / booksPerPage);

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
      initialUserBorrows={initialUserBorrows}
    />
  );
};

export default Page;
