/**
 * Post-invalidate densify for recommendation.write.
 * When payload lacks book rows, mark featured densified-empty (not bare remove)
 * so soft-nav cannot reseed stale SSR via seedFromSsrIfEmpty.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  clearDensifiedEmpty,
  markDensifiedEmpty,
  writeDensifiedEmpty,
} from "@/lib/utils/queryCacheLists";
import { evictAnalyticsCaches } from "@/lib/utils/evictAnalyticsCaches";

type BookLike = { id: string; [key: string]: unknown };

/**
 * Replace featured strip when mutation returns book rows; otherwise write
 * densified-empty featured caches and evict recommendation lists so remount
 * refetches fresh data without painting pre-mutation SSR.
 */
export function densifyRecommendationWrite(
  queryClient: QueryClient,
  args?: {
    featuredBooks?: BookLike[] | null;
  },
): void {
  const featured = args?.featuredBooks;
  if (Array.isArray(featured) && featured.length > 0) {
    queryClient.setQueriesData<BookLike[]>(
      { queryKey: queryKeys.books.featuredRoot },
      () => featured,
    );
    clearDensifiedEmpty(queryKeys.books.featuredRoot);
  } else {
    // Prefer densified-empty over removeQueries — undefined cache lets
    // seedFromSsrIfEmpty reseed stale homepage SSR on soft-nav.
    const featuredQueries = queryClient.getQueriesData<BookLike[]>({
      queryKey: queryKeys.books.featuredRoot,
    });
    if (featuredQueries.length === 0) {
      writeDensifiedEmpty(queryClient, queryKeys.books.featured(1));
    } else {
      for (const [key] of featuredQueries) {
        queryClient.setQueryData(key, []);
        markDensifiedEmpty(key);
      }
    }
  }

  queryClient.removeQueries({
    queryKey: queryKeys.books.recommendationsRoot,
  });
  evictAnalyticsCaches(queryClient);
}
