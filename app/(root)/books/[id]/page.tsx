import React from "react";
import { db } from "@/database/drizzle";
import { books, bookReviews, users } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BookOverview from "@/components/BookOverview";
import BookDetailContent from "@/components/BookDetailContent";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const session = await auth();

  // Fetch data based on id
  const [bookDetails] = await db
    .select()
    .from(books)
    .where(eq(books.id, id))
    .limit(1);

  if (!bookDetails) redirect("/404");

  // Fetch reviews for this book
  const reviews = await db
    .select({
      id: bookReviews.id,
      rating: bookReviews.rating,
      comment: bookReviews.comment,
      createdAt: bookReviews.createdAt,
      updatedAt: bookReviews.updatedAt,
      userFullName: users.fullName,
      userEmail: users.email,
    })
    .from(bookReviews)
    .innerJoin(users, eq(bookReviews.userId, users.id))
    .where(eq(bookReviews.bookId, id))
    .orderBy(desc(bookReviews.createdAt));

  return (
    <>
      {/* BookOverview is a Server Component, so we render it directly */}
      <BookOverview
        {...bookDetails}
        userId={(session?.user?.id || "") as string}
        isDetailPage={true}
      />

      {/* BookDetailContent handles video, summary, and reviews with React Query */}
      <BookDetailContent
        bookId={id}
        userId={session?.user?.id}
        userEmail={session?.user?.email || undefined}
        initialBook={bookDetails}
        initialReviews={reviews}
      />
    </>
  );
};
export default Page;
