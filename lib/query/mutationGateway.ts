/**
 * Central Mutation Cache Gateway — playbook §8.3.
 *
 * Gold order (unskippable for list-shaped CRUD):
 * 1. snapshot baselines from QueryClient
 * 2. await invalidateMutation (marks stale; does NOT blank inactive lists)
 * 3. densify via setQueryData on all related keys (active + inactive)
 *
 * Navigation stays instant: densify is in-memory only; no fetch-all waterfall.
 */

import type { QueryClient } from "@tanstack/react-query";
import {
  invalidateMutation,
  type MutationDomainName,
} from "@/lib/utils/queryInvalidation";

export type CommitMutationCacheArgs<TBaselines> = {
  /** Pre-invalidate snapshot so sibling rows survive active refetch races. */
  snapshot: (queryClient: QueryClient) => TBaselines;
  /** Re-seed related list/detail/badge keys from mutation payload + baselines. */
  densify: (baselines: TBaselines) => void;
};

/**
 * Snapshot → invalidate → densify. Call from mutation onSuccess after server OK.
 */
export async function commitMutationCache<TBaselines>(
  queryClient: QueryClient,
  mutation: MutationDomainName,
  args: CommitMutationCacheArgs<TBaselines>,
): Promise<TBaselines> {
  const baselines = args.snapshot(queryClient);
  await invalidateMutation(queryClient, mutation);
  args.densify(baselines);
  return baselines;
}
