/**
 * Library Overview — recent borrow row.
 * Top: cover | title/status + author/genre/star.
 * Below (start left): Borrowed/Due/Returned, then borrower inline.
 * No kebab — sky title + person link cover navigation.
 * Parent: REQ-0033 overview row polish
 */
"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import CircleBookCover from "@/components/reviews/CircleBookCover";
import { ReviewBorrowMeta } from "@/components/reviews/ReviewBorrowMeta";
import PersonAttribution from "@/components/PersonAttribution";
import { OverviewGenreChip } from "@/lib/ui/overviewGenreChip";
import { BorrowStatusBadge } from "@/lib/ui/semanticBadges";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { cn } from "@/lib/utils";

import type { OverviewRecentBorrow } from "@/lib/admin/adminDashboardStatsTypes";

export type { OverviewRecentBorrow };

export function RecentBorrowRow({ borrow }: { borrow: OverviewRecentBorrow }) {
  const bookHref = `/books/${borrow.bookId}`;
  const userHref = `/admin/users/${borrow.borrower.id}`;

  return (
    <div className="space-y-2 rounded-xl bg-gray-50/90 p-2.5 sm:p-3">
      <div className="flex gap-3">
        <CircleBookCover
          coverUrl={borrow.coverUrl}
          coverColor={borrow.coverColor}
          title={borrow.bookTitle}
          className="border-gray-200"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={bookHref}
              className={cn(
                "min-w-0 line-clamp-1 text-sm font-medium sm:text-base",
                SKY_LINK_LIGHT,
              )}
            >
              {borrow.bookTitle}
            </Link>
            <BorrowStatusBadge status={borrow.status} className="shrink-0" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
            <span className="min-w-0 truncate">{borrow.bookAuthor}</span>
            <OverviewGenreChip genre={borrow.bookGenre} />
            {borrow.bookRating > 0 ? (
              <span className="inline-flex items-center gap-0.5 leading-none text-amber-600">
                <Star
                  className="size-3 shrink-0 fill-amber-500 text-amber-500"
                  aria-hidden
                />
                <span className="leading-none">{borrow.bookRating}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Dates + person start left under the cover (Recent Users rhythm) */}
      {/* Default ReviewBorrowMeta = horizontal flex-wrap (responsive date row) */}
      <ReviewBorrowMeta
        borrowedAt={borrow.borrowDate ?? borrow.createdAt}
        dueDate={borrow.dueDate}
        returnedAt={borrow.returnDate}
        variant="light"
        className="text-[10px] sm:text-xs"
      />
      <PersonAttribution
        person={borrow.borrower}
        href={userHref}
        size={28}
        variant="light"
        layout="inline"
        className="min-w-0"
      />
    </div>
  );
}
