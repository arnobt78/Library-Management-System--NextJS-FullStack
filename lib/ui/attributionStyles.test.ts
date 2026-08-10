/**
 * decisionActorByTone — unit coverage for Decision & Actor “by” label colors.
 */

import { describe, expect, it } from "vitest";
import { decisionActorByTone } from "@/lib/ui/attributionStyles";

describe("decisionActorByTone", () => {
  it("uses emerald for approved / pending", () => {
    expect(decisionActorByTone("APPROVED")).toBe("text-emerald-600");
    expect(decisionActorByTone("PENDING")).toBe("text-emerald-600");
  });

  it("uses rose for rejected", () => {
    expect(decisionActorByTone("REJECTED")).toBe("text-rose-600");
  });

  it("uses slate when withdrawn", () => {
    expect(decisionActorByTone("REJECTED", { withdrawn: true })).toBe(
      "text-slate-500",
    );
  });
});
