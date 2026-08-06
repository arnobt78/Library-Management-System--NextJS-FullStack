/**
 * Shared TanStack list densify + SSR seed helpers.
 *
 * Playbook §8.3 / central Mutation Cache Gateway:
 * - Never invent empty `[]` success data when no prior cache/baseline existed
 *   (that makes RQ ignore later SSR `initialData` → badge/list empty flash).
 * - Prefer overwriting *unmarked* poisoned `[]` with non-empty SSR before `useQuery`
 *   (approve soft-nav heal).
 * - Prefer *densify-marked* `[]` over stale RSC SSR (delete soft-nav must not reseed).
 */

import type { QueryClient, QueryKey } from "@tanstack/react-query";

/** Keys intentionally densified to `[]` (delete / filter-empty) — do not SSR-reseed. */
const densifiedEmptyKeys = new Set<string>();

function serializeKey(key: QueryKey): string {
  return JSON.stringify(key);
}

/** True when densify wrote an intentional empty list for this key. */
export function isDensifiedEmpty(key: QueryKey): boolean {
  return densifiedEmptyKeys.has(serializeKey(key));
}

/** Mark key as intentional densify-empty (soft-nav must keep `[]`). */
export function markDensifiedEmpty(key: QueryKey): void {
  densifiedEmptyKeys.add(serializeKey(key));
}

/** Clear densify-empty mark after a non-empty write or SSR heal of unmarked poison. */
export function clearDensifiedEmpty(key: QueryKey): void {
  densifiedEmptyKeys.delete(serializeKey(key));
}

/**
 * Force intentional densify empty when no prior cache/baseline existed
 * (e.g. delete from My Reviews before book detail ever mounted).
 */
export function writeDensifiedEmpty(
  queryClient: QueryClient,
  key: QueryKey,
): void {
  queryClient.setQueryData(key, []);
  markDensifiedEmpty(key);
}

/**
 * Apply densify mapper to a list key.
 * Upsert/create may seed from `[]` when mapper returns rows; map-only must not.
 */
export function writeMappedList<T>(
  queryClient: QueryClient,
  key: QueryKey,
  fromCache: T[] | undefined,
  fromBaseline: T[] | undefined,
  mapper: (rows: T[]) => T[],
): { prevLen: number | null; nextLen: number; wrote: boolean } {
  const prev = fromCache ?? fromBaseline;
  if (prev === undefined) {
    const next = mapper([]);
    if (next.length === 0) {
      return { prevLen: null, nextLen: 0, wrote: false };
    }
    queryClient.setQueryData(key, next);
    clearDensifiedEmpty(key);
    return { prevLen: null, nextLen: next.length, wrote: true };
  }
  const next = mapper(prev);
  queryClient.setQueryData(key, next);
  if (next.length === 0) {
    markDensifiedEmpty(key);
  } else {
    clearDensifiedEmpty(key);
  }
  return { prevLen: prev.length, nextLen: next.length, wrote: true };
}

/**
 * RQ ignores `initialData` when the key already has ANY cached value — including
 * `[]`. Overwrite *unmarked* empty cache with non-empty SSR so approve soft-nav
 * heals invent-empty poison. Keep densify-marked `[]` so delete soft-nav does
 * not reseed stale RSC rows.
 */
export function seedFromSsrIfEmpty<T>(
  queryClient: QueryClient,
  key: QueryKey,
  initialData: T[] | undefined,
): T[] | undefined {
  if (!initialData || initialData.length === 0) {
    const cached = queryClient.getQueryData<T[]>(key);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    // Intentional densify-empty wins over empty/missing SSR.
    if (Array.isArray(cached) && isDensifiedEmpty(key)) return cached;
    return initialData;
  }

  const cached = queryClient.getQueryData<T[]>(key);
  if (Array.isArray(cached) && cached.length === 0) {
    if (isDensifiedEmpty(key)) {
      return cached;
    }
    queryClient.setQueryData(key, initialData);
    clearDensifiedEmpty(key);
  }

  const after = queryClient.getQueryData<T[]>(key);
  if (after && after.length > 0) return after;
  if (Array.isArray(after) && isDensifiedEmpty(key)) return after;
  return initialData;
}
