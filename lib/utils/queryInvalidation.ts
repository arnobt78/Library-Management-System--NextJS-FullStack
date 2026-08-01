// Parent: REQ-0023
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "../query/keys";

export type QueryDomain =
  | "books"
  | "users"
  | "borrows"
  | "reviews"
  | "admin"
  | "analytics"
  | "recommendations"
  | "operations";

interface InvalidationMessage {
  version: 1;
  type: "query-invalidation";
  timestamp: number;
  domains: QueryDomain[];
}

const CHANNEL_NAME = "bookwise-query-invalidation-v1";

const DOMAIN_KEYS: Record<QueryDomain, readonly QueryKey[]> = {
  books: [
    queryKeys.books.root,
    queryKeys.books.adminRoot,
    queryKeys.books.detailRoot,
    queryKeys.books.borrowStatsRoot,
    queryKeys.books.featuredRoot,
  ],
  users: [
    queryKeys.users.root,
    queryKeys.users.adminRoot,
    queryKeys.users.detailRoot,
    queryKeys.users.pendingRoot,
    queryKeys.users.currentRoot,
  ],
  borrows: [
    queryKeys.borrows.root,
    queryKeys.borrows.requestsRoot,
    queryKeys.borrows.detailRoot,
    queryKeys.borrows.userRoot,
  ],
  reviews: [
    queryKeys.reviews.root,
    queryKeys.reviews.legacyRoot,
    queryKeys.reviews.bookRoot,
    queryKeys.reviews.eligibilityRoot,
  ],
  admin: [
    queryKeys.admin.root,
    queryKeys.admin.stats,
    queryKeys.admin.requestsRoot,
    queryKeys.admin.pendingRequests,
    queryKeys.admin.fineConfig,
  ],
  analytics: [
    queryKeys.admin.analytics,
    queryKeys.admin.analyticsRoot,
    queryKeys.admin.businessInsightsRoot,
  ],
  recommendations: [
    queryKeys.books.recommendationsRoot,
    queryKeys.books.featuredRoot,
  ],
  operations: [
    queryKeys.admin.reminderStats,
    queryKeys.admin.exportStats,
    queryKeys.admin.systemMetrics,
    queryKeys.admin.serviceHealth,
  ],
};

const ALL_DOMAINS = Object.freeze(
  Object.keys(DOMAIN_KEYS) as QueryDomain[]
);

function isQueryDomain(value: unknown): value is QueryDomain {
  return typeof value === "string" && value in DOMAIN_KEYS;
}

export function isInvalidationMessage(
  value: unknown
): value is InvalidationMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<InvalidationMessage>;

  return (
    message.version === 1 &&
    message.type === "query-invalidation" &&
    typeof message.timestamp === "number" &&
    Array.isArray(message.domains) &&
    message.domains.length > 0 &&
    message.domains.every(isQueryDomain)
  );
}

export function createInvalidationMessage(
  domains: readonly QueryDomain[],
  timestamp = Date.now()
): InvalidationMessage {
  return {
    version: 1,
    type: "query-invalidation",
    timestamp,
    domains: [...new Set(domains)],
  };
}

function publishInvalidation(domains: readonly QueryDomain[]): void {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage(createInvalidationMessage(domains));
  channel.close();
}

export function invalidateDomains(
  queryClient: QueryClient,
  domains: readonly QueryDomain[],
  options: { broadcast?: boolean } = {}
): Promise<void> {
  const uniqueDomains = [...new Set(domains)];
  const keys = uniqueDomains.flatMap((domain) => DOMAIN_KEYS[domain]);
  const uniqueKeys = [
    ...new Map(keys.map((queryKey) => [JSON.stringify(queryKey), queryKey])).values(),
  ];

  // Calling invalidateQueries marks inactive data stale immediately and starts
  // bounded refetches only for currently observed queries.
  const invalidations = uniqueKeys.map((queryKey) =>
    queryClient.invalidateQueries({ queryKey, exact: false, refetchType: "active" })
  );

  if (options.broadcast !== false) publishInvalidation(uniqueDomains);
  return Promise.all(invalidations).then(() => undefined);
}

export function subscribeToQueryInvalidation(
  queryClient: QueryClient
): () => void {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return () => undefined;
  }

  const channel = new BroadcastChannel(CHANNEL_NAME);
  const handleMessage = (event: MessageEvent<unknown>) => {
    if (!isInvalidationMessage(event.data)) return;
    void invalidateDomains(queryClient, event.data.domains, { broadcast: false });
  };

  channel.addEventListener("message", handleMessage);
  return () => {
    channel.removeEventListener("message", handleMessage);
    channel.close();
  };
}

export const invalidateBooksQueries = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, ["books", "recommendations"]);

export const invalidateUsersQueries = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, ["users"]);

export const invalidateBorrowsQueries = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, ["borrows"]);

export const invalidateReviewsQueries = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, ["reviews"]);

export const invalidateAdminQueries = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, ["admin", "operations"]);

export const invalidateAnalyticsQueries = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, ["analytics"]);

export const invalidateAfterBookChange = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, [
    "books",
    "borrows",
    "reviews",
    "admin",
    "analytics",
    "recommendations",
    "operations",
  ]);

export const invalidateAfterBorrowChange = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, [
    "borrows",
    "books",
    "reviews",
    "admin",
    "analytics",
    "recommendations",
    "operations",
  ]);

export const invalidateAfterUserChange = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, [
    "users",
    "borrows",
    "reviews",
    "admin",
    "analytics",
    "operations",
  ]);

export const invalidateAfterReviewChange = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, ["reviews", "books", "analytics"]);

export const invalidateAfterAdminChange = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, [
    "admin",
    "users",
    "borrows",
    "analytics",
    "operations",
  ]);

export const invalidateAfterRecommendationChange = (
  queryClient: QueryClient
) =>
  invalidateDomains(queryClient, [
    "recommendations",
    "books",
    "admin",
    "analytics",
  ]);

export const invalidateDashboardQueries = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, ["admin", "analytics", "operations"]);

export const invalidateAllQueries = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, ALL_DOMAINS);
