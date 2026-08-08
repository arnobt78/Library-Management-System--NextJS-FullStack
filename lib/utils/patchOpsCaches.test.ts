/**
 * Unit tests for operations.write densify helpers (no network).
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import { densifyReminderStats } from "@/lib/utils/patchOpsCaches";

describe("patchOpsCaches", () => {
  it("densifyReminderStats bumps remindersSentToday", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.admin.reminderStats, {
      dueSoon: 2,
      overdue: 1,
      remindersSentToday: 4,
    });
    densifyReminderStats(client, { sentCount: 3 });
    expect(client.getQueryData(queryKeys.admin.reminderStats)).toMatchObject({
      dueSoon: 2,
      overdue: 1,
      remindersSentToday: 7,
    });
  });
});
