/**
 * Unit tests for Activity History display helpers.
 */

import { describe, expect, it } from "vitest";
import {
  activityEntityHref,
  activityEntityUnavailableReason,
  formatActivityDetails,
  isActivityEntityLinkable,
} from "@/lib/ui/activityLogDisplay";

describe("activityEntityHref", () => {
  it("maps borrow to detail when id present, else queue", () => {
    expect(activityEntityHref("borrow", "br1")).toBe(
      "/admin/book-requests/br1",
    );
    expect(activityEntityHref("borrow", null)).toBe("/admin/book-requests");
  });

  it("maps admin-request to user 360 via details.userId", () => {
    expect(
      activityEntityHref("admin-request", "req1", { userId: "u1" }),
    ).toBe("/admin/users/u1");
    expect(activityEntityHref("admin-request", "req1", {})).toBeUndefined();
  });

  it("maps reservation to book edit via details.bookId", () => {
    expect(
      activityEntityHref("reservation", "r1", { bookId: "b9" }),
    ).toBe("/admin/books/b9/edit");
    expect(activityEntityHref("reservation", "r1", {})).toBeUndefined();
  });

  it("maps ops/export/recs summary statuses to Automation", () => {
    expect(
      activityEntityHref("book", null, { status: "EXPORT_BOOKS" }),
    ).toBe("/admin/automation");
    expect(
      activityEntityHref("user", null, { status: "EXPORT_USERS" }),
    ).toBe("/admin/automation");
    expect(
      activityEntityHref("borrow", null, { status: "DUE_SOON_REMINDERS" }),
    ).toBe("/admin/automation");
    expect(
      activityEntityHref("book", null, {
        status: "RECOMMENDATIONS_GENERATED",
      }),
    ).toBe("/admin/automation");
    expect(
      activityEntityHref("borrow", null, { status: "FINE_FORCE_UPDATE" }),
    ).toBe("/admin/automation");
    expect(
      activityEntityHref("book", null, { status: "TRENDING_UPDATED" }),
    ).toBe("/admin/automation");
  });

  it("keeps borrow detail for non-ops borrow rows with id", () => {
    expect(activityEntityHref("borrow", "br1", { status: "BORROWED" })).toBe(
      "/admin/book-requests/br1",
    );
  });
});

describe("isActivityEntityLinkable", () => {
  it("allows UPDATE book with id", () => {
    expect(
      isActivityEntityLinkable({
        action: "UPDATE",
        entityType: "book",
        entityId: "b1",
      }),
    ).toBe(true);
  });

  it("blocks DELETE even when route exists", () => {
    expect(
      isActivityEntityLinkable({
        action: "DELETE",
        entityType: "book",
        entityId: "b1",
      }),
    ).toBe(false);
  });

  it("blocks CANCELLED book (no sensible cancelled-book admin surface)", () => {
    expect(
      isActivityEntityLinkable({
        action: "UPDATE",
        entityType: "book",
        entityId: "b1",
        details: { status: "CANCELLED" },
      }),
    ).toBe(false);
  });

  it("allows REJECTED user and review (detail pages exist)", () => {
    expect(
      isActivityEntityLinkable({
        action: "UPDATE",
        entityType: "user",
        entityId: "u1",
        details: { status: "REJECTED" },
      }),
    ).toBe(true);
    expect(
      isActivityEntityLinkable({
        action: "UPDATE",
        entityType: "review",
        entityId: "rv1",
        details: { status: "REJECTED" },
      }),
    ).toBe(true);
  });

  it("allows borrow, admin-request, reservation when status is CANCELLED/REJECTED", () => {
    expect(
      isActivityEntityLinkable({
        action: "UPDATE",
        entityType: "borrow",
        entityId: "br1",
        details: { status: "CANCELLED" },
      }),
    ).toBe(true);
    expect(
      isActivityEntityLinkable({
        action: "UPDATE",
        entityType: "admin-request",
        entityId: "req1",
        details: { status: "REJECTED", userId: "u1" },
      }),
    ).toBe(true);
    expect(
      isActivityEntityLinkable({
        action: "UPDATE",
        entityType: "reservation",
        entityId: "r1",
        details: { status: "CANCELLED", bookId: "b1" },
      }),
    ).toBe(true);
  });

  it("allows null-entityId automation summary rows", () => {
    expect(
      isActivityEntityLinkable({
        action: "UPDATE",
        entityType: "book",
        entityId: null,
        details: { status: "EXPORT_ANALYTICS" },
      }),
    ).toBe(true);
    expect(
      isActivityEntityLinkable({
        action: "UPDATE",
        entityType: "borrow",
        entityId: null,
        details: { status: "OVERDUE_REMINDERS" },
      }),
    ).toBe(true);
  });
});

describe("activityEntityUnavailableReason", () => {
  it("mentions deleted for DELETE", () => {
    expect(
      activityEntityUnavailableReason({
        action: "DELETE",
        entityType: "book",
        entityId: "b1",
      }),
    ).toMatch(/deleted/i);
  });
});

describe("formatActivityDetails", () => {
  it("formats preferred keys as labeled lines", () => {
    expect(
      formatActivityDetails({ title: "Algorithms", status: "BORROWED" }),
    ).toBe("Title: Algorithms\nStatus: BORROWED");
  });

  it("returns em dash when empty", () => {
    expect(formatActivityDetails(null)).toBe("—");
    expect(formatActivityDetails({})).toBe("—");
  });

  it("omits userId and bookId from details text (used for Entity href)", () => {
    expect(
      formatActivityDetails({
        status: "APPROVED",
        userId: "u1",
        bookId: "b1",
      }),
    ).toBe("Status: APPROVED");
  });
});
