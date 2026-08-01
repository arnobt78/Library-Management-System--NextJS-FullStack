// Parent: REQ-0022
// Shared bounded pagination prevents malformed or oversized database reads.

export function parsePositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number
): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback;
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit: number,
  maximumLimit = 100
): { page: number; limit: number } {
  return {
    page: parsePositiveInteger(searchParams.get("page"), 1, 1_000_000),
    limit: parsePositiveInteger(
      searchParams.get("limit"),
      defaultLimit,
      maximumLimit
    ),
  };
}
