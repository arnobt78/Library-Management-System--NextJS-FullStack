/**
 * Book identity strip — circle cover + title / by author (PersonAttribution stack).
 * Optional genre badge + catalog rating for dialog headers and My Reviews cards.
 * Parent: CR-0003 / REQ-0035 polish
 */

import Link from "next/link";
import { Library, Star } from "lucide-react";
import CircleBookCover from "@/components/reviews/CircleBookCover";
import StarRow from "@/components/ui/StarRow";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ReviewBookIdentityProps = {
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  coverColor?: string | null;
  /** When set, title links to book detail. */
  bookId?: string | null;
  genre?: string | null;
  /** Catalog average rating (0 hides). */
  bookRating?: number | null;
  /**
   * showMeta=false — title/author only (My Reviews header).
   * showMeta=true — also genre badge + StarRow / numeric rating (dialog).
   */
  showMeta?: boolean;
  /** Prefer compact single-star number vs full StarRow for catalog rating. */
  catalogRatingMode?: "number" | "stars";
  className?: string;
  titleClassName?: string;
};

export default function ReviewBookIdentity({
  title,
  author,
  coverUrl,
  coverColor,
  bookId,
  genre,
  bookRating,
  showMeta = false,
  catalogRatingMode = "number",
  className,
  titleClassName,
}: ReviewBookIdentityProps) {
  const rating = typeof bookRating === "number" ? bookRating : 0;
  const titleNode = bookId ? (
    <Link
      href={`/books/${bookId}`}
      prefetch={false}
      className={cn(
        "truncate text-base font-semibold text-light-100 transition-colors hover:text-light-100/70 sm:text-lg",
        titleClassName,
      )}
    >
      {title}
    </Link>
  ) : (
    <p
      className={cn(
        "truncate text-base font-semibold text-light-100 sm:text-lg",
        titleClassName,
      )}
    >
      {title}
    </p>
  );

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <CircleBookCover
        coverUrl={coverUrl}
        coverColor={coverColor}
        title={title}
      />
      <div className="min-w-0 flex-1 ">
        {titleNode}
        <p className="truncate text-xs sm:text-sm">
          <span className="text-light-100/70">by </span>
          <span className="text-light-200 sm:text-base">
            {author?.trim() || "Unknown"}
          </span>
        </p>
        {showMeta ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {genre ? (
              <Badge variant="glassGenre" className="px-1.5 py-0.5 sm:px-2">
                <Library className="size-3" aria-hidden />
                {genre}
              </Badge>
            ) : null}
            {rating > 0 ? (
              catalogRatingMode === "stars" ? (
                <StarRow
                  rating={Math.round(rating)}
                  starClassName="size-3 sm:size-3.5"
                  filledClassName="fill-yellow-400 text-yellow-400"
                  emptyClassName="fill-gray-300 text-gray-300"
                  className="shrink-0"
                />
              ) : (
                <div className="flex items-center gap-1">
                  <Star
                    className="size-3 fill-current text-yellow-400 sm:size-3.5"
                    aria-hidden
                  />
                  <span className="text-xs text-yellow-400 sm:text-sm">
                    {rating}
                  </span>
                </div>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
