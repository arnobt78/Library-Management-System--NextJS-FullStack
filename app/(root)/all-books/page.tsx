import React from "react";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { desc, asc, eq, like, and, or, sql } from "drizzle-orm";
import BookCollection from "@/components/BookCollection";

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
    return <div>Please sign in to view books.</div>;
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
    />
  );
};

export default Page;
