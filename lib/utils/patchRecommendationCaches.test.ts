/**
 * Unit tests for recommendation.write densify helpers (no network).
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import { densifyRecommendationWrite } from "@/lib/utils/patchRecommendationCaches";
import { isDensifiedEmpty } from "@/lib/utils/queryCacheLists";

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

  it("keeps prior featured on empty refresh (no blank homepage strip)", () => {
    const client = new QueryClient();
    const key = queryKeys.books.featured(1);
    const prior = [{ id: "stale", title: "Prior Featured" }];
    client.setQueryData(key, prior);
    densifyRecommendationWrite(client);
    expect(client.getQueryData(key)).toEqual(prior);
    expect(isDensifiedEmpty(key)).toBe(false);
  });

  it("does not invent densified-empty featured when no featured query mounted", () => {
    const client = new QueryClient();
    densifyRecommendationWrite(client);
    const key = queryKeys.books.featured(1);
    expect(client.getQueryData(key)).toBeUndefined();
    expect(isDensifiedEmpty(key)).toBe(false);
  });
});
