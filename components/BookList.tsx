import React from "react";
import BookCard from "@/components/BookCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookCopy } from "lucide-react";

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
      <h2 className="font-bebas-neue text-xl text-light-100 sm:text-3xl">
        {title}
      </h2>

      {books.length > 0 ? (
        <ul className="book-list">
          {books.map((book) => (
            <BookCard key={book.id} {...book} isLoanedBook={false} />
          ))}
        </ul>
      ) : (
        <p className="text-base text-light-100 sm:text-lg">
          No books available.
        </p>
      )}

      {showViewAllButton && (
        <div className="mt-6 flex items-center justify-center sm:mt-12">
          <span className="cta-shine-wrap">
            <Button
              asChild
              className="cta-shine-button p-4 font-bebas-neue text-base text-dark-100 sm:p-6 sm:text-xl"
            >
              <Link
                href="/all-books"
                className="inline-flex items-center justify-center gap-2"
              >
                <BookCopy className="size-4 sm:size-5" />
                <span>Discover All Books</span>
              </Link>
            </Button>
          </span>
        </div>
      )}
    </section>
  );
};
export default BookList;
