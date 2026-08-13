/**
 * Unit: mergeDensifiedDetail preserves densified keys when incoming omits them.
 */

import { describe, expect, it } from "vitest";
import { mergeDensifiedDetail } from "@/lib/utils/mergeDensifiedDetail";

type Row = {
  id: string;
  status?: string;
  approvedByActor?: { id: string; fullName: string } | null;
  auditEvents?: { id: string }[];
};

describe("mergeDensifiedDetail", () => {
  it("restores omitted densified keys from prev", () => {
    const prev: Row = {
      id: "1",
      status: "BORROWED",
      approvedByActor: { id: "a", fullName: "Admin" },
      auditEvents: [{ id: "e1" }],
    };
    const incoming: Row = {
      id: "1",
      status: "BORROWED",
    };
    const next = mergeDensifiedDetail(prev, incoming, [
      "approvedByActor",
      "auditEvents",
    ]);
    expect(next.approvedByActor).toEqual(prev.approvedByActor);
    expect(next.auditEvents).toEqual(prev.auditEvents);
  });

  it("lets explicit null clear densified attribution", () => {
    const prev: Row = {
      id: "1",
      approvedByActor: { id: "a", fullName: "Admin" },
    };
    const incoming: Row = {
      id: "1",
      approvedByActor: null,
    };
    const next = mergeDensifiedDetail(prev, incoming, ["approvedByActor"]);
    expect(next.approvedByActor).toBeNull();
  });

  it("returns incoming when prev is missing", () => {
    const incoming: Row = { id: "1", status: "PENDING" };
    expect(mergeDensifiedDetail(undefined, incoming, ["status"])).toEqual(
      incoming,
    );
  });
});
