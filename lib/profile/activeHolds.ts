/**
 * Active reservation holds — shared WAITING / READY (+ optional READY expiry).
 * Used by My Profile KPI and ReservationsPanel so counts never drift.
 */

export type HoldLike = {
  status: string;
  readyExpiresAt?: string | null;
};

/**
 * @param now — wall clock ms. When null, READY is treated active (panel init).
 *   When set, READY past readyExpiresAt is excluded.
 */
export function isActiveHold(item: HoldLike, now: number | null): boolean {
  if (item.status === "WAITING") return true;
  if (item.status !== "READY") return false;
  if (now == null || !item.readyExpiresAt) return true;
  return new Date(item.readyExpiresAt).getTime() > now;
}

export function filterActiveHolds<T extends HoldLike>(
  items: T[],
  now: number | null,
): T[] {
  return items.filter((item) => isActiveHold(item, now));
}

export function countActiveHolds(
  items: HoldLike[],
  now: number | null,
): number {
  return filterActiveHolds(items, now).length;
}
