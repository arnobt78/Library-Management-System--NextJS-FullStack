/**
 * Unit tests for recommendation.write densify helpers (no network).
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import { densifyRecommendationWrite } from "@/lib/utils/patchRecommendationCaches";
import {
  isDensifiedEmpty,
  seedFromSsrIfEmpty,
} from "@/lib/utils/queryCacheLists";

describe("densifyRecommendationWrite", () => {
  it("replaces featured when payload has books", () => {
    const client = new QueryClient();
    const key = queryKeys.books.featured(1);
    client.setQueryData(key, [{ id: "old", title: "Old" }]);
    densifyRecommendationWrite(client, {
      featuredBooks: [{ id: "new", title: "New" }],
    });
    expect(client.getQueryData(key)).toEqual([{ id: "new", title: "New" }]);
  });

  it("marks featured densified-empty so SSR seed cannot reflash stale hero", () => {
    const client = new QueryClient();
    const key = queryKeys.books.featured(1);
    client.setQueryData(key, [{ id: "stale", title: "Stale Featured" }]);
    densifyRecommendationWrite(client);
    expect(client.getQueryData(key)).toEqual([]);
    expect(isDensifiedEmpty(key)).toBe(true);

    // seedFromSsrIfEmpty must keep densified [] over non-empty SSR.
    const seeded = seedFromSsrIfEmpty(client, key, [
      { id: "ssr", title: "SSR Stale" },
    ]);
    expect(seeded).toEqual([]);
    expect(client.getQueryData(key)).toEqual([]);
  });

  it("seeds densified-empty featured(1) when no featured query was mounted", () => {
    const client = new QueryClient();
    densifyRecommendationWrite(client);
    const key = queryKeys.books.featured(1);
    expect(client.getQueryData(key)).toEqual([]);
    expect(isDensifiedEmpty(key)).toBe(true);
  });
});
