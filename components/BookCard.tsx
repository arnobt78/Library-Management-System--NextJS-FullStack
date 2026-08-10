import React from "react";
import PrefetchLink from "@/components/PrefetchLink";
import BookCover from "@/components/BookCover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar, Star } from "lucide-react";

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
    <PrefetchLink
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
          <Star
            className="size-3.5 shrink-0 fill-light-100 text-light-100 sm:size-4"
            aria-hidden
          />
          <span className="book-genre-rating">{rating}</span>
          <p className="book-genre">{genre}</p>
        </div>
      </div>

      {isLoanedBook && (
        <div className="mt-2.5 w-full sm:mt-3">
          <div className="book-loaned">
            <Calendar
              className="size-4 shrink-0 text-light-100 sm:size-[18px]"
              aria-hidden
            />
            <p className="text-xs text-light-100 sm:text-sm">
              11 days left to return
            </p>
          </div>

          <Button className="book-btn">Download receipt</Button>
        </div>
      )}
    </PrefetchLink>
  </li>
);

export default BookCard;
