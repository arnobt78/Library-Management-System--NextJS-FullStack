// Parent: REQ-0027; TC-0060
import { describe, expect, it } from "vitest";
import { beginMutation, isLatestMutation } from "./mutationOrdering";

describe("mutation response ordering", () => {
  it("rejects an older same-entity response after a newer mutation begins", () => {
    const older = beginMutation("borrow:1");
    const newer = beginMutation("borrow:1");
    expect(isLatestMutation("borrow:1", older)).toBe(false);
    expect(isLatestMutation("borrow:1", newer)).toBe(true);
  });
});
