"use client";

/**
 * HomeFeaturedHero
 *
 * Client hydrator for the homepage book hero. Mirrors HomeRecommendations:
 * SSR paints via initialHero; React Query key ["featured-books", 1] updates
 * after book create/update/delete without a hard reload.
 * Inactive RQ[0] is ignored so soft-nav never flashes a deactivated hero.
 */

import React from "react";
import BookOverviewContent from "@/components/BookOverviewContent";
import BookSkeleton from "@/components/skeletons/BookSkeleton";
import { useFeaturedBooks } from "@/hooks/useQueries";
import type { BorrowRecord } from "@/lib/services/borrows";

interface HomeFeaturedHeroProps {
  /** Featured (or fallback newest) book from SSR — null when catalog is empty */
  initialHero: Book | null;
  userId?: string;
  userStatus?: string | null;
  initialUserBorrows?: BorrowRecord[];
  /** Borrow stats for the SSR hero book (avoids duplicate fetch on first paint) */
  initialStats?: {
    totalBorrows: number;
    activeBorrows: number;
    returnedBorrows: number;
  };
}

const HomeFeaturedHero: React.FC<HomeFeaturedHeroProps> = ({
  initialHero,
  userId = "",
  userStatus = null,
  initialUserBorrows,
  initialStats,
}) => {
  const {
    data: featuredBooks,
    isLoading,
    isError,
  } = useFeaturedBooks(1, initialHero ? [initialHero] : []);

  // Ignore inactive RQ[0] — densify primary; SSR initialHero is the fallback.
  const rqHero = featuredBooks?.[0];
  const hero =
    (rqHero && rqHero.isActive !== false ? rqHero : null) ??
    initialHero ??
    null;

  // Emergency skeleton only when we have no SSR hero and are still loading
  if (isLoading && !initialHero) {
    return <BookSkeleton />;
  }

  if (isError && !hero) {
    return (
      <section className="book-overview">
        <div className="flex flex-1 flex-col gap-5">
          <h1>Unable to load featured book</h1>
          <p className="book-overview_content">Please try again shortly.</p>
        </div>
      </section>
    );
  }

  if (!hero) {
    return (
      <section className="book-overview">
        <div className="flex flex-1 flex-col gap-5">
          <h1>No books in the catalog yet</h1>
          <p className="book-overview_content">
            Add a book from the admin panel and optionally mark it as featured
            for the homepage hero.
          </p>
        </div>
      </section>
    );
  }

  // Remount when hero id changes so useBook + stats bind to the new book
  const statsForHero =
    initialHero && hero.id === initialHero.id ? initialStats : undefined;

  return (
    <BookOverviewContent
      key={hero.id}
      bookId={hero.id}
      userId={userId}
      userStatus={userStatus}
      initialBook={hero}
      initialStats={statsForHero}
      initialUserBorrows={initialUserBorrows}
    />
  );
};

export default HomeFeaturedHero;
