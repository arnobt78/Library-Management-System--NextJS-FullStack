"use client";

/**
 * Compact admin table book identity — Inactive Books / Review Moderation DNA:
 * CircleBookCover + sky title + author + genre chip + catalog star number.
 * Optional Available n / Total n inline with genre/star (Borrow Queue densified copies).
 * Parent: queue book inventory line
 */

import PrefetchLink from "@/components/PrefetchLink";
import { BookOpen, Star } from "lucide-react";
import CircleBookCover from "@/components/reviews/CircleBookCover";
import { getBookAvailabilityStatus } from "@/lib/books/bookDetailsViewModel";
import { OverviewGenreChip } from "@/lib/ui/overviewGenreChip";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { TABLE_CELL_TITLE } from "@/lib/ui/tableCellStyles";
import { cn } from "@/lib/utils";

/** Light admin tones — match AdminBookDetailsPanel AVAIL_TONE. */
const AVAIL_TONE: Record<"emerald" | "amber" | "rose", string> = {
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
};

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
  /** When both finite, show compact Available/Total inline with genre/star. */
  availableCopies?: number | null;
  totalCopies?: number | null;
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
  availableCopies,
  totalCopies,
  className,
}: AdminBookIdentityCellProps) {
  const href = titleHref ?? `/books/${bookId}`;
  const catalogRating = typeof rating === "number" ? rating : 0;
  const hasInventory =
    typeof availableCopies === "number" &&
    Number.isFinite(availableCopies) &&
    typeof totalCopies === "number" &&
    Number.isFinite(totalCopies);
  const availability = hasInventory
    ? getBookAvailabilityStatus(availableCopies, totalCopies)
    : null;

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
        {/* Genre · star · Available/Total — one responsive meta row */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 overflow-hidden">
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
          {hasInventory && availability ? (
            <span className="inline-flex min-w-0 items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground">
              <BookOpen
                className={cn(
                  "size-2.5 shrink-0",
                  AVAIL_TONE[availability.tone],
                )}
                aria-hidden
              />
              <span className="truncate">
                Available{" "}
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    AVAIL_TONE[availability.tone],
                  )}
                >
                  {availableCopies}
                </span>
                {" / Total "}
                <span className="font-medium tabular-nums text-gray-700">
                  {totalCopies}
                </span>
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
