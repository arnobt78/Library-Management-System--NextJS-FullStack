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
  | "operations"
  | "circulation";

interface InvalidationMessage {
  version: 1;
  type: "query-invalidation";
  eventId: string;
  generation: number;
  timestamp: number;
  domains: QueryDomain[];
}

const CHANNEL_NAME = "bookwise-query-invalidation-v1";
let invalidationGeneration = 0;

export const MUTATION_DOMAIN_REGISTRY = {
  "book.write": ["books", "users", "borrows", "reviews", "admin", "analytics", "recommendations", "operations", "circulation"],
  "user.write": ["users", "borrows", "reviews", "admin", "analytics", "operations", "circulation"],
  "borrow.lifecycle": ["borrows", "books", "users", "reviews", "admin", "analytics", "recommendations", "operations", "circulation"],
  "reservation.lifecycle": ["circulation", "borrows", "books", "users", "admin", "analytics", "recommendations"],
  "renewal.write": ["circulation", "borrows", "books", "users", "admin", "analytics"],
  "review.write": ["reviews", "books", "users", "analytics"],
  "admin-request.write": ["admin", "users", "analytics", "operations"],
  "fine.write": ["borrows", "users", "admin", "analytics", "operations"],
  "recommendation.write": ["recommendations", "books", "admin", "analytics"],
  "operations.write": ["borrows", "admin", "analytics", "operations"],
} as const satisfies Record<string, readonly QueryDomain[]>;

export const MUTATION_RSC_PATH_REGISTRY = {
  "book.write": ["/", "/all-books", "/books/[id]", "/admin/books", "/admin/users/[id]", "/admin/business-insights"],
  "user.write": [
    "/my-profile",
    "/make-admin",
    "/admin/account-requests",
    "/admin/users",
    "/admin/users/[id]",
    "/admin/business-insights",
  ],
  "borrow.lifecycle": ["/", "/all-books", "/books/[id]", "/my-profile", "/admin", "/admin/book-requests", "/admin/users/[id]", "/admin/business-insights"],
  "reservation.lifecycle": ["/all-books", "/books/[id]", "/my-profile", "/admin", "/admin/book-requests", "/admin/users/[id]", "/admin/business-insights"],
  "renewal.write": ["/books/[id]", "/my-profile", "/admin/book-requests", "/admin/users/[id]", "/admin/business-insights"],
  "review.write": ["/books/[id]", "/my-profile", "/admin/users/[id]", "/admin/business-insights"],
  // Make-admin decisions land on /make-admin + All Users (+ user 360); signup queue is user.write
  "admin-request.write": [
    "/make-admin",
    "/admin/users",
    "/admin/users/[id]",
    "/admin/business-insights",
  ],
  "fine.write": ["/my-profile", "/admin/book-requests", "/admin/users/[id]", "/admin/business-insights"],
  "recommendation.write": ["/", "/all-books", "/admin/automation", "/admin/business-insights"],
  "operations.write": ["/my-profile", "/api-status", "/admin", "/admin/book-requests", "/admin/automation", "/admin/business-insights"],
} as const satisfies Record<keyof typeof MUTATION_DOMAIN_REGISTRY, readonly string[]>;

export type MutationDomainName = keyof typeof MUTATION_DOMAIN_REGISTRY;

const DOMAIN_KEYS: Record<QueryDomain, readonly QueryKey[]> = {
  books: [
    queryKeys.books.root,
    queryKeys.books.adminRoot,
    queryKeys.books.detailRoot,
    queryKeys.books.borrowStatsRoot,
    queryKeys.books.featuredRoot,
    queryKeys.books.relatedRoot,
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
    queryKeys.admin.recentRequestDecisions,
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
    queryKeys.books.relatedRoot,
  ],
  operations: [
    queryKeys.admin.reminderStats,
    queryKeys.admin.exportStats,
    queryKeys.admin.systemMetrics,
    queryKeys.admin.serviceHealth,
  ],
  circulation: [
    queryKeys.circulation.root,
    queryKeys.circulation.reservationsRoot,
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
    typeof message.eventId === "string" &&
    message.eventId.length > 0 &&
    typeof message.generation === "number" &&
    typeof message.timestamp === "number" &&
    Array.isArray(message.domains) &&
    message.domains.length > 0 &&
    message.domains.every(isQueryDomain)
  );
}

export function createInvalidationMessage(
  domains: readonly QueryDomain[],
  timestamp = Date.now(),
  eventId = globalThis.crypto?.randomUUID?.() ?? `${timestamp}-${invalidationGeneration + 1}`,
): InvalidationMessage {
  invalidationGeneration += 1;
  return {
    version: 1,
    type: "query-invalidation",
    eventId,
    generation: invalidationGeneration,
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

  // Never render known-stale inactive data after a confirmed mutation. The
  // server shell remains visible while a newly mounted observer fetches truth.
  for (const queryKey of uniqueKeys) {
    queryClient.removeQueries({ queryKey, exact: false, type: "inactive" });
  }

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
  const receivedEventIds = new Set<string>();
  const handleMessage = (event: MessageEvent<unknown>) => {
    if (!isInvalidationMessage(event.data)) return;
    if (receivedEventIds.has(event.data.eventId)) return;
    receivedEventIds.add(event.data.eventId);
    if (receivedEventIds.size > 100) receivedEventIds.delete(receivedEventIds.values().next().value!);
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
  invalidateMutation(queryClient, "book.write");

export const invalidateAfterBorrowChange = (queryClient: QueryClient) =>
  invalidateMutation(queryClient, "borrow.lifecycle");

export const invalidateAfterUserChange = (queryClient: QueryClient) =>
  invalidateMutation(queryClient, "user.write");

export const invalidateAfterReviewChange = (queryClient: QueryClient) =>
  invalidateMutation(queryClient, "review.write");

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
  invalidateMutation(queryClient, "recommendation.write");

export const invalidateDashboardQueries = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, ["admin", "analytics", "operations"]);

export const invalidateAllQueries = (queryClient: QueryClient) =>
  invalidateDomains(queryClient, ALL_DOMAINS);

export const invalidateMutation = (
  queryClient: QueryClient,
  mutation: MutationDomainName,
) => invalidateDomains(queryClient, MUTATION_DOMAIN_REGISTRY[mutation]);
