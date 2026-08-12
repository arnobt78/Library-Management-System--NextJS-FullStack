/**
 * resolveDecisionActor — prefer SSR currentAdmin card over session null-card.
 */

import { describe, expect, it } from "vitest";
import { resolveDecisionActor } from "@/lib/admin/resolveDecisionActor";

describe("resolveDecisionActor", () => {
  it("prefers SSR currentAdmin universityCard", () => {
    expect(
      resolveDecisionActor(
        {
          id: "admin-1",
          fullName: "Test Admin",
          email: "test@admin.com",
          universityCard: "/cards/admin.jpg",
        },
        { id: "admin-1", name: "Session Name", email: "test@admin.com" },
      ),
    ).toEqual({
      id: "admin-1",
      fullName: "Test Admin",
      email: "test@admin.com",
      universityCard: "/cards/admin.jpg",
    });
  });

  it("falls back to session with null universityCard", () => {
    expect(
      resolveDecisionActor(null, {
        id: "admin-1",
        name: "Test Admin",
        email: "test@admin.com",
      }),
    ).toEqual({
      id: "admin-1",
      fullName: "Test Admin",
      email: "test@admin.com",
      universityCard: null,
    });
  });

  it("returns null when neither admin nor session email is usable", () => {
    expect(resolveDecisionActor(null, null)).toBeNull();
    expect(resolveDecisionActor(null, { name: "X" })).toBeNull();
  });
});
