/**
 * Unit tests for active hold filtering (KPI + ReservationsPanel parity).
 */

import { describe, expect, it } from "vitest";
import {
  countActiveHolds,
  filterActiveHolds,
  isActiveHold,
} from "@/lib/profile/activeHolds";

describe("activeHolds", () => {
  const now = Date.parse("2026-08-13T12:00:00.000Z");

  it("counts WAITING and unexpired READY", () => {
    const items = [
      { status: "WAITING" },
      { status: "READY", readyExpiresAt: "2026-08-13T13:00:00.000Z" },
      { status: "READY", readyExpiresAt: "2026-08-13T11:00:00.000Z" },
      { status: "FULFILLED" },
      { status: "CANCELLED" },
    ];
    expect(countActiveHolds(items, now)).toBe(2);
    expect(filterActiveHolds(items, now)).toHaveLength(2);
  });

  it("treats READY as active when now is null", () => {
    expect(
      isActiveHold(
        { status: "READY", readyExpiresAt: "2020-01-01T00:00:00.000Z" },
        null,
      ),
    ).toBe(true);
  });

  it("treats READY without expiry as active", () => {
    expect(isActiveHold({ status: "READY", readyExpiresAt: null }, now)).toBe(
      true,
    );
  });
});
