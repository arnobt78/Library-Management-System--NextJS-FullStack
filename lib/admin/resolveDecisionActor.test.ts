/**
 * resolveDecisionActor — prefer SSR currentAdmin card over session null-card.
 * resolveActivityActor — Activity densify fields with same preference.
 */

import { describe, expect, it } from "vitest";
import {
  resolveActivityActor,
  resolveDecisionActor,
} from "@/lib/admin/resolveDecisionActor";

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
});

describe("resolveActivityActor", () => {
  it("maps SSR decisionActor card into densify fields", () => {
    expect(
      resolveActivityActor(
        { id: "admin-1", name: "Session", email: "test@admin.com" },
        {
          id: "admin-1",
          fullName: "Test Admin",
          email: "test@admin.com",
          universityCard: "/cards/admin.jpg",
        },
      ),
    ).toEqual({
      actorId: "admin-1",
      actorName: "Test Admin",
      actorEmail: "test@admin.com",
      actorUniversityCard: "/cards/admin.jpg",
      actorRole: null,
    });
  });

  it("session-only densify keeps null universityCard", () => {
    expect(
      resolveActivityActor({
        id: "admin-1",
        name: "Test Admin",
        email: "test@admin.com",
      }),
    ).toEqual({
      actorId: "admin-1",
      actorName: "Test Admin",
      actorEmail: "test@admin.com",
      actorUniversityCard: null,
      actorRole: null,
    });
  });
});
