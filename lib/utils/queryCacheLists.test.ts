/**
 * Unit tests for shared list densify / SSR seed helpers.
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  clearDensifiedEmpty,
  isDensifiedEmpty,
  markDensifiedEmpty,
  seedFromSsrIfEmpty,
  writeDensifiedEmpty,
  writeMappedList,
} from "@/lib/utils/queryCacheLists";

describe("writeMappedList", () => {
  it("does not invent empty [] when no prior cache/baseline", () => {
    const client = new QueryClient();
    const key = ["list", "a"] as const;
    const result = writeMappedList(
      client,
      key,
      undefined,
      undefined,
      (rows) => rows.filter((r) => r !== "x"),
    );
    expect(result.wrote).toBe(false);
    expect(client.getQueryData(key)).toBeUndefined();
    expect(isDensifiedEmpty(key)).toBe(false);
  });

  it("seeds from [] when upsert mapper returns rows", () => {
    const client = new QueryClient();
    const key = ["list", "b"] as const;
    const result = writeMappedList(client, key, undefined, undefined, () => [
      { id: "1" },
    ]);
    expect(result.wrote).toBe(true);
    expect(client.getQueryData(key)).toEqual([{ id: "1" }]);
    expect(isDensifiedEmpty(key)).toBe(false);
  });

  it("maps over baseline when cache was wiped and marks densify-empty", () => {
    const client = new QueryClient();
    const key = ["list", "c"] as const;
    clearDensifiedEmpty(key);
    const result = writeMappedList(
      client,
      key,
      undefined,
      [{ id: "old" }, { id: "keep" }],
      (rows) => rows.filter((r) => r.id !== "old" && r.id !== "keep"),
    );
    expect(result.wrote).toBe(true);
    expect(client.getQueryData(key)).toEqual([]);
    expect(isDensifiedEmpty(key)).toBe(true);
  });
});

describe("seedFromSsrIfEmpty", () => {
  it("overwrites unmarked poisoned [] with non-empty SSR", () => {
    const client = new QueryClient();
    const key = ["ssr", "a"] as const;
    clearDensifiedEmpty(key);
    client.setQueryData(key, []);
    const seed = seedFromSsrIfEmpty(client, key, [{ id: "ssr" }]);
    expect(seed).toEqual([{ id: "ssr" }]);
    expect(client.getQueryData(key)).toEqual([{ id: "ssr" }]);
  });

  it("keeps densify-marked [] over non-empty SSR (delete soft-nav)", () => {
    const client = new QueryClient();
    const key = ["ssr", "densify-empty"] as const;
    writeDensifiedEmpty(client, key);
    const seed = seedFromSsrIfEmpty(client, key, [{ id: "stale-ssr" }]);
    expect(seed).toEqual([]);
    expect(client.getQueryData(key)).toEqual([]);
    expect(isDensifiedEmpty(key)).toBe(true);
  });

  it("prefers non-empty cache over SSR", () => {
    const client = new QueryClient();
    const key = ["ssr", "b"] as const;
    client.setQueryData(key, [{ id: "cache" }]);
    const seed = seedFromSsrIfEmpty(client, key, [{ id: "ssr" }]);
    expect(seed).toEqual([{ id: "cache" }]);
  });

  it("returns densify-marked [] when SSR is empty/missing", () => {
    const client = new QueryClient();
    const key = ["ssr", "c"] as const;
    writeDensifiedEmpty(client, key);
    expect(seedFromSsrIfEmpty(client, key, undefined)).toEqual([]);
    expect(seedFromSsrIfEmpty(client, key, [])).toEqual([]);
  });
});

describe("writeDensifiedEmpty", () => {
  it("writes [] and marks the key", () => {
    const client = new QueryClient();
    const key = ["force", "empty"] as const;
    clearDensifiedEmpty(key);
    writeDensifiedEmpty(client, key);
    expect(client.getQueryData(key)).toEqual([]);
    expect(isDensifiedEmpty(key)).toBe(true);
    markDensifiedEmpty(key);
    expect(isDensifiedEmpty(key)).toBe(true);
  });
});
