/**
 * Unit tests for fine.write densify helpers (no network).
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import {
  densifyFineConfig,
  densifyOverdueFines,
} from "@/lib/utils/patchFineCaches";

describe("patchFineCaches", () => {
  it("densifyFineConfig writes fineAmount", () => {
    const client = new QueryClient();
    densifyFineConfig(client, {
      success: true,
      fineAmount: 2.5,
    });
    expect(client.getQueryData(queryKeys.admin.fineConfig)).toMatchObject({
      fineAmount: 2.5,
    });
  });

  it("densifyOverdueFines patches borrow fineAmount + fineStatus by record id", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.borrows.user("u-1"), [
      { id: "b-1", fineAmount: "0", userId: "u-1", bookId: "book-1" },
      { id: "b-2", fineAmount: "1", userId: "u-1", bookId: "book-2" },
    ]);
    client.setQueryData(queryKeys.borrows.requestDetail("b-1"), {
      id: "b-1",
      fineAmount: "0",
      userId: "u-1",
      bookId: "book-1",
      status: "BORROWED",
    });
    densifyOverdueFines(client, [
      {
        recordId: "b-1",
        daysOverdue: 3,
        fineAmount: "3.00",
        updated: true,
        verifiedFineAmount: "3.00",
      },
    ]);
    const rows = client.getQueryData<
      Array<{ id: string; fineAmount: string; fineStatus?: string }>
    >(queryKeys.borrows.user("u-1"));
    expect(rows?.find((r) => r.id === "b-1")?.fineAmount).toBe("3.00");
    expect(rows?.find((r) => r.id === "b-1")?.fineStatus).toBe("STAMPED");
    expect(rows?.find((r) => r.id === "b-2")?.fineAmount).toBe("1");
    const detail = client.getQueryData<{
      fineAmount: string;
      fineStatus?: string;
      displayFineAmount?: string;
    }>(queryKeys.borrows.requestDetail("b-1"));
    expect(detail?.fineAmount).toBe("3.00");
    expect(detail?.fineStatus).toBe("STAMPED");
    expect(detail?.displayFineAmount).toBe("3.00");
  });
});
