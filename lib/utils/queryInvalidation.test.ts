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
  it("removes known-stale inactive data before the helper settles", async () => {
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
    const settled = invalidateAllQueries(client);

    for (const key of keys) {
      expect(client.getQueryState(key)).toBeUndefined();
    }
    await settled;
  });

  it("invalidates inactive related domains for later navigation", async () => {
    const client = createQueryClient();
    client.setQueryData(queryKeys.books.detail("book-1"), { id: "book-1" });
    client.setQueryData(queryKeys.admin.analytics, { total: 1 });

    await invalidateAfterBorrowChange(client);

    expect(client.getQueryData(queryKeys.books.detail("book-1"))).toBeUndefined();
    expect(client.getQueryData(queryKeys.admin.analytics)).toBeUndefined();

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

  it("invalidates derived recommendation and export statistics after CRUD", async () => {
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

      expect(client.getQueryState(queryKeys.admin.exportStats)).toBeUndefined();
      if (invalidate === invalidateAfterBorrowChange) {
        expect(client.getQueryState(queryKeys.books.recommendations("user-1", 10))).toBeUndefined();
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
    expect(MUTATION_DOMAIN_REGISTRY).toEqual({
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
    });
    expect(MUTATION_RSC_PATH_REGISTRY).toEqual({
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
      "admin-request.write": [
        "/make-admin",
        "/admin/users",
        "/admin/users/[id]",
        "/admin/business-insights",
      ],
      "fine.write": ["/my-profile", "/admin/book-requests", "/admin/users/[id]", "/admin/business-insights"],
      "recommendation.write": ["/", "/all-books", "/admin/automation", "/admin/business-insights"],
      "operations.write": ["/my-profile", "/api-status", "/admin", "/admin/book-requests", "/admin/automation", "/admin/business-insights"],
    });
    expect(Object.keys(MUTATION_RSC_PATH_REGISTRY).sort()).toEqual(Object.keys(MUTATION_DOMAIN_REGISTRY).sort());
    for (const mutation of Object.keys(MUTATION_DOMAIN_REGISTRY) as (keyof typeof MUTATION_DOMAIN_REGISTRY)[]) {
      expect(MUTATION_DOMAIN_REGISTRY[mutation].length).toBeGreaterThan(0);
      expect(MUTATION_RSC_PATH_REGISTRY[mutation].length).toBeGreaterThan(0);
    }
  });
});
