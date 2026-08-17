// Parent: REQ-0023
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { queryKeys } from "../query/keys";
import {
  createInvalidationMessage,
  invalidateAllQueries,
  invalidateAfterBookChange,
  invalidateAfterBorrowChange,
  invalidateAfterUserChange,
  invalidateDomains,
  invalidateMutation,
  isInvalidationMessage,
  MUTATION_DOMAIN_REGISTRY,
  MUTATION_RSC_PATH_REGISTRY,
  subscribeToQueryInvalidation,
} from "./queryInvalidation";

class FakeBroadcastChannel {
  static channels = new Map<string, Set<FakeBroadcastChannel>>();
  static messages: unknown[] = [];

  private listeners = new Set<(event: MessageEvent<unknown>) => void>();

  constructor(private readonly name: string) {
    const channels = FakeBroadcastChannel.channels.get(name) ?? new Set();
    channels.add(this);
    FakeBroadcastChannel.channels.set(name, channels);
  }

  postMessage(data: unknown): void {
    FakeBroadcastChannel.messages.push(data);
    for (const channel of FakeBroadcastChannel.channels.get(this.name) ?? []) {
      if (channel === this) continue;
      for (const listener of channel.listeners) {
        listener({ data } as MessageEvent<unknown>);
      }
    }
  }

  addEventListener(
    type: string,
    listener: (event: MessageEvent<unknown>) => void
  ): void {
    if (type === "message") this.listeners.add(listener);
  }

  removeEventListener(
    type: string,
    listener: (event: MessageEvent<unknown>) => void
  ): void {
    if (type === "message") this.listeners.delete(listener);
  }

  close(): void {
    FakeBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

afterEach(() => {
  FakeBroadcastChannel.channels.clear();
  FakeBroadcastChannel.messages = [];
  vi.unstubAllGlobals();
});

describe("query invalidation contract", () => {
  it("marks inactive data stale without blanking cache (densify-safe)", async () => {
    const client = createQueryClient();
    const keys = [
      queryKeys.books.detail("book-1"),
      queryKeys.users.detail("user-1"),
      queryKeys.borrows.user("user-1"),
      queryKeys.reviews.book("book-1"),
      queryKeys.admin.stats,
      queryKeys.admin.analytics,
      queryKeys.books.recommendations("user-1", 10),
      queryKeys.admin.serviceHealth,
    ] as const;

    for (const key of keys) client.setQueryData(key, { ready: true });
    await invalidateAllQueries(client);

    // Prefer invalidate over removeQueries: data stays for soft-nav paint;
    // densify / active refetch reconcile truth without empty flash.
    for (const key of keys) {
      expect(client.getQueryData(key)).toEqual({ ready: true });
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });

  it("keeps inactive related data visible while marking stale for later navigation", async () => {
    const client = createQueryClient();
    client.setQueryData(queryKeys.books.detail("book-1"), { id: "book-1" });
    client.setQueryData(queryKeys.admin.analytics, { total: 1 });

    await invalidateAfterBorrowChange(client);

    expect(client.getQueryData(queryKeys.books.detail("book-1"))).toEqual({
      id: "book-1",
    });
    expect(client.getQueryState(queryKeys.books.detail("book-1"))?.isInvalidated).toBe(
      true,
    );
    expect(client.getQueryData(queryKeys.admin.analytics)).toEqual({ total: 1 });
    expect(client.getQueryState(queryKeys.admin.analytics)?.isInvalidated).toBe(
      true,
    );

    const queryFn = vi.fn().mockResolvedValue({ id: "book-1", fresh: true });
    const observer = new QueryObserver(client, {
      queryKey: queryKeys.books.detail("book-1"),
      queryFn,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledOnce());
    await vi.waitFor(() =>
      expect(client.getQueryData(queryKeys.books.detail("book-1"))).toEqual({
        id: "book-1",
        fresh: true,
      })
    );
    unsubscribe();
  });

  it("marks derived recommendation and export statistics stale after CRUD", async () => {
    const cases = [
      invalidateAfterBookChange,
      invalidateAfterBorrowChange,
      invalidateAfterUserChange,
    ] as const;

    for (const invalidate of cases) {
      const client = createQueryClient();
      client.setQueryData(queryKeys.admin.exportStats, { total: 1 });
      client.setQueryData(queryKeys.books.recommendations("user-1", 10), []);

      await invalidate(client);

      expect(client.getQueryData(queryKeys.admin.exportStats)).toEqual({
        total: 1,
      });
      expect(client.getQueryState(queryKeys.admin.exportStats)?.isInvalidated).toBe(
        true,
      );
      if (invalidate === invalidateAfterBorrowChange) {
        expect(
          client.getQueryState(
            queryKeys.books.recommendations("user-1", 10),
          )?.isInvalidated,
        ).toBe(true);
      }
    }
  });

  it("immediately refetches an active related query", async () => {
    const client = createQueryClient();
    const queryFn = vi.fn().mockResolvedValue({ id: "book-1" });
    const observer = new QueryObserver(client, {
      queryKey: queryKeys.books.detail("book-1"),
      queryFn,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    await observer.refetch();

    await invalidateAfterBorrowChange(client);

    expect(queryFn).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("propagates a data-free invalidation to another tab without loops", async () => {
    vi.stubGlobal("window", { BroadcastChannel: FakeBroadcastChannel });
    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);

    const sourceClient = createQueryClient();
    const receivingClient = createQueryClient();
    const receivingKey = queryKeys.users.detail("user-1");
    const queryFn = vi.fn().mockResolvedValue({ id: "user-1", fresh: true });
    receivingClient.setQueryData(receivingKey, {
      id: "user-1",
      email: "private@example.com",
    });
    const observer = new QueryObserver(receivingClient, {
      queryKey: receivingKey,
      queryFn,
    });
    const stopObserving = observer.subscribe(() => undefined);
    await observer.refetch();
    expect(queryFn).toHaveBeenCalledOnce();
    const unsubscribe = subscribeToQueryInvalidation(receivingClient);

    const startedAt = performance.now();
    await invalidateDomains(sourceClient, ["users"]);
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));

    expect(performance.now() - startedAt).toBeLessThan(1000);
    expect(FakeBroadcastChannel.messages).toHaveLength(1);
    expect(FakeBroadcastChannel.messages[0]).toEqual({
      version: 1,
      type: "query-invalidation",
      eventId: expect.any(String),
      generation: expect.any(Number),
      timestamp: expect.any(Number),
      domains: ["users"],
    });
    expect(JSON.stringify(FakeBroadcastChannel.messages[0])).not.toContain(
      "private@example.com"
    );
    unsubscribe();
    stopObserving();
  });

  it("rejects malformed or empty cross-tab messages", () => {
    expect(isInvalidationMessage(createInvalidationMessage(["books"], 1))).toBe(
      true
    );
    expect(isInvalidationMessage({ type: "query-invalidation", domains: [] })).toBe(
      false
    );
    expect(
      isInvalidationMessage({
        version: 1,
        type: "query-invalidation",
        timestamp: 1,
        domains: ["credentials"],
      })
    ).toBe(false);
  });

  it("exports the exact mutation-to-domain contract", () => {
    // Parent: CR-0003 / REQ-0034 — tickets/notifications/activityLog domains
    // extend book/borrow/user/review/admin-request families so the bell,
    // Activity History, and the two new admin surfaces stay in sync too.
    expect(MUTATION_DOMAIN_REGISTRY).toEqual({
      "book.write": ["books", "users", "borrows", "reviews", "admin", "analytics", "recommendations", "operations", "circulation", "activityLog"],
      "user.write": ["users", "borrows", "reviews", "admin", "analytics", "operations", "circulation", "notifications", "activityLog"],
      "borrow.lifecycle": ["borrows", "books", "users", "reviews", "admin", "analytics", "recommendations", "operations", "circulation", "notifications", "activityLog"],
      "reservation.lifecycle": ["circulation", "borrows", "books", "users", "admin", "analytics", "recommendations", "activityLog"],
      "renewal.write": ["circulation", "borrows", "books", "users", "admin", "analytics", "activityLog"],
      "review.write": ["reviews", "books", "users", "admin", "analytics", "notifications", "activityLog"],
      "admin-request.write": ["admin", "users", "analytics", "operations", "notifications", "activityLog"],
      "fine.write": ["borrows", "users", "admin", "analytics", "operations", "activityLog"],
      "recommendation.write": ["recommendations", "books", "admin", "analytics", "activityLog"],
      "operations.write": ["borrows", "admin", "analytics", "operations", "activityLog"],
      "ticket.write": ["tickets", "notifications", "activityLog", "admin"],
      "notification.write": ["notifications"],
    });
    expect(MUTATION_RSC_PATH_REGISTRY).toEqual({
      "book.write": ["/", "/all-books", "/books/[id]", "/admin/books", "/admin/books/[id]", "/admin/users/[id]", "/admin/business-insights", "/admin/activity-history"],
      "user.write": [
        "/my-profile",
        "/make-admin",
        "/admin",
        "/admin/account-requests",
        "/admin/account-requests/[userId]",
        "/admin/admin-requests",
        "/admin/admin-requests/[id]",
        "/admin/users",
        "/admin/users/[id]",
        "/admin/business-insights",
        "/admin/activity-history",
      ],
      "borrow.lifecycle": ["/", "/all-books", "/books/[id]", "/my-profile", "/admin", "/admin/book-requests", "/admin/book-requests/[id]", "/admin/users/[id]", "/admin/account-requests/[userId]", "/admin/admin-requests/[id]", "/admin/business-insights", "/admin/activity-history"],
      "reservation.lifecycle": [
        "/all-books",
        "/books/[id]",
        "/my-profile",
        "/admin",
        "/admin/book-requests",
        "/admin/book-requests/[id]",
        "/admin/users/[id]",
        "/admin/account-requests/[userId]",
        "/admin/admin-requests/[id]",
        "/admin/business-insights",
        "/admin/activity-history",
      ],
      "renewal.write": [
        "/books/[id]",
        "/my-profile",
        "/admin/book-requests",
        "/admin/book-requests/[id]",
        "/admin/users/[id]",
        "/admin/account-requests/[userId]",
        "/admin/admin-requests/[id]",
        "/admin/business-insights",
        "/admin/activity-history",
      ],
      "review.write": ["/books/[id]", "/my-profile", "/admin", "/admin/users/[id]", "/admin/business-insights", "/admin/book-reviews", "/admin/book-reviews/[id]", "/admin/activity-history"],
      "admin-request.write": [
        "/make-admin",
        "/admin/admin-requests",
        "/admin/admin-requests/[id]",
        "/admin/users",
        "/admin/users/[id]",
        "/admin/business-insights",
        "/admin/activity-history",
      ],
      "fine.write": [
        "/my-profile",
        "/admin/book-requests",
        "/admin/book-requests/[id]",
        "/admin/users/[id]",
        "/admin/account-requests/[userId]",
        "/admin/admin-requests/[id]",
        "/admin/business-insights",
        "/admin/automation",
        "/admin/activity-history",
      ],
      "recommendation.write": [
        "/",
        "/all-books",
        "/admin/automation",
        "/admin/business-insights",
        "/admin/activity-history",
      ],
      "operations.write": [
        "/my-profile",
        "/api-status",
        "/admin",
        "/admin/book-requests",
        "/admin/automation",
        "/admin/business-insights",
        "/admin/activity-history",
      ],
      "ticket.write": [
        "/admin/support-tickets",
        "/admin/support-tickets/[id]",
        "/support-tickets",
        "/support-tickets/[id]",
        "/admin",
        "/admin/users/[id]",
        "/admin/account-requests/[userId]",
        "/admin/admin-requests/[id]",
        "/admin/activity-history",
      ],
      "notification.write": [],
    });
    expect(Object.keys(MUTATION_RSC_PATH_REGISTRY).sort()).toEqual(Object.keys(MUTATION_DOMAIN_REGISTRY).sort());
    for (const mutation of Object.keys(MUTATION_DOMAIN_REGISTRY) as (keyof typeof MUTATION_DOMAIN_REGISTRY)[]) {
      expect(MUTATION_DOMAIN_REGISTRY[mutation].length).toBeGreaterThan(0);
      // notification.write is bell-only (mark read/delete) — no RSC page depends on it.
      if (mutation === "notification.write") {
        expect(MUTATION_RSC_PATH_REGISTRY[mutation].length).toBe(0);
      } else {
        expect(MUTATION_RSC_PATH_REGISTRY[mutation].length).toBeGreaterThan(0);
      }
    }
  });

  it("invalidates signup + admin-request detail keys via domain roots", async () => {
    const client = createQueryClient();
    const signupDetailKey = queryKeys.users.signupRequestDetail("user-1");
    const privilegeHistoryKey =
      queryKeys.users.adminPrivilegeHistory("user-1");
    const adminDetailKey = queryKeys.admin.requestDetail("req-1");
    client.setQueryData(signupDetailKey, { id: "user-1", status: "PENDING" });
    client.setQueryData(privilegeHistoryKey, []);
    client.setQueryData(adminDetailKey, { id: "req-1", status: "PENDING" });

    await invalidateMutation(client, "user.write");
    expect(client.getQueryState(signupDetailKey)?.isInvalidated).toBe(true);

    await invalidateMutation(client, "admin-request.write");
    expect(client.getQueryState(adminDetailKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(privilegeHistoryKey)?.isInvalidated).toBe(
      true,
    );
  });

  it("invalidates User 360 activity via activityLog.userRoot", async () => {
    const client = createQueryClient();
    const userActivityKey = queryKeys.activityLog.user("user-1");
    client.setQueryData(userActivityKey, []);

    await invalidateMutation(client, "user.write");
    expect(client.getQueryState(userActivityKey)?.isInvalidated).toBe(true);
  });
});
