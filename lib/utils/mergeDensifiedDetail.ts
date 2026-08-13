/**
 * Soft-nav / prefetch merge — thin list or API payloads must not wipe densified fields.
 * Overlay `incoming` on `prev`, then restore keys omitted (`undefined`) from densified cache.
 * Explicit `null` from server wins (cleared attribution).
 * Parent: densify preserve across PrefetchLink + invalidate refetch
 */

export function mergeDensifiedDetail<T extends object>(
  prev: T | undefined,
  incoming: T,
  densifiedKeys: readonly (keyof T)[],
): T {
  if (!prev) return { ...incoming };
  const next = { ...prev, ...incoming };
  for (const key of densifiedKeys) {
    if (incoming[key] === undefined && prev[key] !== undefined) {
      next[key] = prev[key];
    }
  }
  return next;
}
