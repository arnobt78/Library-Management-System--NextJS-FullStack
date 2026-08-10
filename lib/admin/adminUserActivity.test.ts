/**
 * Unit: activityHistoryForUserWhere returns a combined OR predicate.
 */

import { describe, expect, it } from "vitest";
import { activityHistoryForUserWhere } from "@/lib/admin/adminUserActivity";

describe("activityHistoryForUserWhere", () => {
  it("returns a combined OR SQL for a subject userId", () => {
    const where = activityHistoryForUserWhere("subject-1");
    expect(where).toBeDefined();
    expect(where).not.toBeNull();
    // Drizzle SQL — has queryChunks for actor / entity / details.userId branches.
    const chunks = (where as { queryChunks?: unknown[] }).queryChunks;
    expect(Array.isArray(chunks)).toBe(true);
    expect((chunks as unknown[]).length).toBeGreaterThan(1);
  });
});
