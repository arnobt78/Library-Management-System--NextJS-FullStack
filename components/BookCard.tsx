import React from "react";
import Link from "next/link";
import BookCover from "@/components/BookCover";
import { cn } from "@/lib/utils";
// import Image from "next/image";
import { Button } from "@/components/ui/button";

interface BookCardProps extends Book {
  isLoanedBook?: boolean;
}

const BookCard = ({
  id,
  title,
  author,
  genre,
  coverColor,
  coverUrl,
  isLoanedBook = false,
}: BookCardProps) => (
  <li className={cn(isLoanedBook && "xs:w-52 w-full")}>
    <Link
      href={`/books/${id}`}
      className={cn(isLoanedBook && "w-full flex flex-col items-center")}
    >
      <BookCover coverColor={coverColor} coverImage={coverUrl} />

      <div className={cn("mt-3 sm:mt-4", !isLoanedBook && "xs:max-w-40 max-w-28")}>
        <p className="book-title">{title}</p>
        <p className="book-author">{author}</p>
        <p className="book-genre">{genre}</p>
      </div>

      {isLoanedBook && (
        <div className="mt-2.5 w-full sm:mt-3">
          <div className="book-loaned">
            <img
              src="/icons/calendar.svg"
              alt="calendar"
              width={18}
              height={18}
              className="size-4 object-contain sm:size-[18px]"
            />
            <p className="text-xs text-light-100 sm:text-sm">11 days left to return</p>
          </div>

          <Button className="book-btn">Download receipt</Button>
        </div>
      )}
    </Link>
  </li>
);

export default BookCard;
