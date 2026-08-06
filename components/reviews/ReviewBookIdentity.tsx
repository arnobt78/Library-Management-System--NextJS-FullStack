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
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
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
  /** dark = profile glass; light = admin white panels */
  variant?: "dark" | "light";
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
  variant = "dark",
  className,
  titleClassName,
}: ReviewBookIdentityProps) {
  const rating = typeof bookRating === "number" ? bookRating : 0;
  const isLight = variant === "light";
  const titleNode = bookId ? (
    <Link
      href={`/books/${bookId}`}
      prefetch={false}
      className={cn(
        "truncate text-base font-semibold sm:text-lg",
        isLight
          ? cn(SKY_LINK_LIGHT, "hover:underline")
          : "text-light-100 transition-colors hover:text-light-100/70",
        titleClassName,
      )}
    >
      {title}
    </Link>
  ) : (
    <p
      className={cn(
        "truncate text-base font-semibold sm:text-lg",
        isLight ? "text-dark-400" : "text-light-100",
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
        className={
          isLight
            ? "size-14 border-gray-200 sm:size-16"
            : undefined
        }
        size={isLight ? 64 : 56}
      />
      <div className="min-w-0 flex-1">
        {titleNode}
        <p className="truncate text-xs sm:text-sm">
          <span className={isLight ? "text-gray-500" : "text-light-100/70"}>
            by{" "}
          </span>
          <span
            className={cn(
              isLight ? "text-gray-700" : "text-light-200",
              "sm:text-base",
            )}
          >
            {author?.trim() || "Unknown"}
          </span>
        </p>
        {showMeta ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {genre ? (
              <Badge
                variant={isLight ? "outline" : "glassGenre"}
                className={cn(
                  "px-1.5 py-0.5 sm:px-2",
                  isLight && "text-[10px] font-normal text-violet-700",
                )}
              >
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
                  <span
                    className={cn(
                      "text-xs sm:text-sm",
                      isLight ? "text-amber-600" : "text-yellow-400",
                    )}
                  >
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
