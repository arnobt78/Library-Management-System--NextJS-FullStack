/**
 * Post-invalidate densify for recommendation.write.
 * When payload lacks book rows, evict recommendation/featured caches so
 * soft-nav cannot keep pre-generate lists.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { clearDensifiedEmpty } from "@/lib/utils/queryCacheLists";
import { evictAnalyticsCaches } from "@/lib/utils/evictAnalyticsCaches";

type BookLike = { id: string; [key: string]: unknown };

/**
 * Replace featured strip when mutation returns book rows; otherwise evict
 * recommendations + featured so remount refetches fresh lists.
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
    // Evict — soft-nav must not paint pre-mutation featured/recs.
    queryClient.removeQueries({ queryKey: queryKeys.books.featuredRoot });
  }

  queryClient.removeQueries({
    queryKey: queryKeys.books.recommendationsRoot,
  });
  evictAnalyticsCaches(queryClient);
}
