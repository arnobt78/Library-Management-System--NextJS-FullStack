import React from "react";
import Link from "next/link";
import BookCover from "@/components/BookCover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BookCardProps extends Book {
  isLoanedBook?: boolean;
}

/**
 * BookCard — catalog tile (home, related, all-books).
 * Centered cover in full cell width; meta spans card width; reserved 2-line title/author
 * so genre rows align across the grid. Soft glow + hover tilt (reduced-motion safe).
 */
const BookCard = ({
  id,
  title,
  author,
  genre,
  rating,
  coverColor,
  coverUrl,
  isLoanedBook = false,
}: BookCardProps) => (
  <li className="w-full">
    <Link
      href={`/books/${id}`}
      className={cn(
        "book-card group flex w-full flex-col items-center",
        isLoanedBook && "xs:w-52"
      )}
    >
      {/* Cover stack: soft glow + hover scale/tilt */}
      <div className="book-card__cover-wrap">
        <div
          className="book-card__glow"
          style={
            {
              ["--cover-glow" as string]: coverColor || "#e7c9a5",
            } as React.CSSProperties
          }
          aria-hidden
        />
        <div className="book-card__cover-motion relative z-10">
          <BookCover coverColor={coverColor} coverImage={coverUrl} />
        </div>
      </div>

      {/* Full card width text — centered under cover for even catalog columns */}
      <div className="book-card__meta mt-3 w-full sm:mt-4">
        <p className="book-title">{title}</p>
        <p className="book-author">{author}</p>
        <div className="book-genre-row">
          <img
            src="/icons/star.svg"
            alt=""
            width={16}
            height={16}
            className="size-3.5 shrink-0 sm:size-4"
          />
          <span className="book-genre-rating">{rating}</span>
          <p className="book-genre">{genre}</p>
        </div>
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
            <p className="text-xs text-light-100 sm:text-sm">
              11 days left to return
            </p>
          </div>

          <Button className="book-btn">Download receipt</Button>
        </div>
      )}
    </Link>
  </li>
);

export default BookCard;
