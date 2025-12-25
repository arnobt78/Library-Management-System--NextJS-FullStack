import React from "react";
import BookCard from "@/components/BookCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  books: Book[];
  containerClassName?: string;
  showViewAllButton?: boolean;
}

const BookList = ({
  title,
  books,
  containerClassName,
  showViewAllButton = false,
}: Props) => {
  return (
    <section className={containerClassName}>
      <h2 className="font-bebas-neue text-2xl text-light-100 sm:text-4xl">{title}</h2>

      {books.length > 0 ? (
        <ul className="book-list">
          {books.map((book) => (
            <BookCard key={book.title} {...book} isLoanedBook={false} />
          ))}
        </ul>
      ) : (
        <p className="text-base text-light-100 sm:text-lg">No books available.</p>
      )}

      {showViewAllButton && (
        <div className="mt-6 flex justify-center sm:mt-12">
          <Link href="/all-books">
            <Button className="p-4 font-bebas-neue text-base text-dark-100 sm:p-6 sm:text-xl">
              View All Books
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
};
export default BookList;
