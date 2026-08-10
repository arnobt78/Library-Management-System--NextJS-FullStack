/**
 * Library Overview — Top Rated Books row (cover + sky title + author + genre chip + star).
 * Mirrors Recent Borrows identity; no kebab.
 * Parent: REQ-0033 overview row polish
 */
"use client";

import PrefetchLink from "@/components/PrefetchLink";
import { Star } from "lucide-react";
import CircleBookCover from "@/components/reviews/CircleBookCover";
import type { AdminDashboardTopRatedBook } from "@/lib/admin/adminDashboardStatsTypes";
import { OverviewGenreChip } from "@/lib/ui/overviewGenreChip";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { cn } from "@/lib/utils";

export function OverviewTopRatedRow({
  book,
}: {
  book: AdminDashboardTopRatedBook;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50/90 p-2 sm:p-2.5">
      <CircleBookCover
        coverUrl={book.coverUrl}
        coverColor={book.coverColor}
        title={book.title}
        className="size-10 border-gray-200 sm:size-12"
        size={48}
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <PrefetchLink
          href={`/books/${book.id}`}
          className={cn(
            "block truncate text-sm font-medium",
            SKY_LINK_LIGHT,
          )}
        >
          {book.title}
        </PrefetchLink>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
          <span className="min-w-0 truncate">{book.author}</span>
          <OverviewGenreChip genre={book.genre} />
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium leading-none text-amber-600">
        <Star
          className="size-3 shrink-0 fill-amber-500 text-amber-500"
          aria-hidden
        />
        <span className="leading-none">{book.rating}</span>
      </span>
    </div>
  );
}
