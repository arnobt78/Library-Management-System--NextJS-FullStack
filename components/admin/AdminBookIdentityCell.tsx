"use client";

/**
 * Compact admin table book identity — Inactive Books / Review Moderation DNA:
 * CircleBookCover + sky title + author + genre chip + catalog star number.
 * No gray overview card chrome (for table cells).
 */

import PrefetchLink from "@/components/PrefetchLink";
import { Star } from "lucide-react";
import CircleBookCover from "@/components/reviews/CircleBookCover";
import { OverviewGenreChip } from "@/lib/ui/overviewGenreChip";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { TABLE_CELL_TITLE } from "@/lib/ui/tableCellStyles";
import { cn } from "@/lib/utils";

export type AdminBookIdentityCellProps = {
  bookId: string;
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  coverColor?: string | null;
  genre?: string | null;
  /** Catalog average rating (0 / null hides star). */
  rating?: number | null;
  /** Title link — default `/books/{bookId}`. */
  titleHref?: string | null;
  className?: string;
};

export function AdminBookIdentityCell({
  bookId,
  title,
  author,
  coverUrl,
  coverColor,
  genre,
  rating,
  titleHref,
  className,
}: AdminBookIdentityCellProps) {
  const href = titleHref ?? `/books/${bookId}`;
  const catalogRating = typeof rating === "number" ? rating : 0;

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <CircleBookCover
        coverUrl={coverUrl}
        coverColor={coverColor}
        title={title}
        size={36}
        className="size-9 shrink-0 border border-gray-200"
      />
      <div className="min-w-0 flex-1 overflow-hidden leading-none">
        <PrefetchLink
          href={href}
          prefetch={false}
          className={cn(TABLE_CELL_TITLE, "block truncate", SKY_LINK_LIGHT)}
        >
          {title}
        </PrefetchLink>
        {author ? (
          <span className="block truncate text-xs text-muted-foreground">
            {author}
          </span>
        ) : null}
        <div className="mt-0.5 flex flex-nowrap items-center gap-x-1.5 overflow-hidden">
          <OverviewGenreChip
            genre={genre}
            className="max-w-32 shrink-0 truncate px-1.5 py-0 text-[10px] sm:text-[10px]"
          />
          {catalogRating > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] tabular-nums text-amber-600">
              <Star
                className="size-2.5 fill-amber-400 text-amber-400"
                aria-hidden
              />
              {catalogRating}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
