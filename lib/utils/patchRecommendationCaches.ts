/**
 * Post-invalidate densify for recommendation.write.
 * When payload has book rows, replace featured. When empty/missing, leave
 * prior featured painted until active refetch (Automation Refresh must not
 * blank the homepage strip).
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { clearDensifiedEmpty } from "@/lib/utils/queryCacheLists";
import { evictAnalyticsCaches } from "@/lib/utils/evictAnalyticsCaches";

type BookLike = { id: string; [key: string]: unknown };

/**
 * Replace featured strip when mutation returns book rows; otherwise keep
 * existing featured cache and only drop recommendation lists + analytics so
 * remount refetch fills without a blank hero flash.
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
  }
  // Empty refresh: do not write featured [] / markDensifiedEmpty — leave prior
  // strip until active invalidation refetch supplies fresh rows.

  queryClient.removeQueries({
    queryKey: queryKeys.books.recommendationsRoot,
  });
  evictAnalyticsCaches(queryClient);
}
