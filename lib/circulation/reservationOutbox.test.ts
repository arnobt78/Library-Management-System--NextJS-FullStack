// Parent: REQ-0030; TC-0045
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/database/drizzle", () => ({ db: {} }));
vi.mock("@/lib/services/email-service", () => ({
  sendIdempotentEmailViaResend: vi.fn(),
}));
vi.mock("@/lib/notifications/inApp", () => ({
  createInAppNotification: vi.fn(async () => undefined),
}));

import {
  deliverReservationOutbox,
  deliveryFailureDisposition,
  retryDelayMinutes,
  type ReservationOutboxDependencies,
  type ReservationOutboxItem,
} from "./reservationOutbox";

const readyItem: ReservationOutboxItem = {
  id: "10000000-0000-4000-8000-000000000001",
  reservationId: "20000000-0000-4000-8000-000000000001",
  eventKey: "reservation:READY",
  attemptCount: 1,
  reservationStatus: "READY",
  readyExpiresAt: new Date(Date.now() + 60_000),
  recipientUserId: "30000000-0000-4000-8000-000000000001",
  recipientEmail: "reader@example.test",
  recipientName: "Reader",
  bookTitle: "Book",
};

function dependencies(items: ReservationOutboxItem[]) {
  return {
    claim: vi.fn(async () => items),
    send: vi.fn(async () => ({ messageId: "message-1", provider: "Resend" as const })),
    complete: vi.fn(async () => undefined),
    retry: vi.fn<ReservationOutboxDependencies["retry"]>(async () => "retried"),
  } satisfies ReservationOutboxDependencies;
}

describe("reservation outbox delivery", () => {
  it("delivers READY events and records the external receipt", async () => {
    const deps = dependencies([readyItem]);
    await expect(deliverReservationOutbox(20, deps)).resolves.toEqual({
      claimed: 1,
      delivered: 1,
      retried: 0,
      skipped: 0,
      deadLettered: 0,
    });
    expect(deps.send).toHaveBeenCalledWith(readyItem);
    expect(deps.complete).toHaveBeenCalledWith(readyItem, {
      messageId: "message-1",
      provider: "Resend",
    });
  });

  it("retries provider failures without marking the event delivered", async () => {
    const deps = dependencies([readyItem]);
    deps.send.mockRejectedValueOnce(new Error("provider timeout"));
    await expect(deliverReservationOutbox(20, deps)).resolves.toMatchObject({ retried: 1 });
    expect(deps.retry).toHaveBeenCalledWith(readyItem, "DELIVERY_FAILED");
    expect(deps.complete).not.toHaveBeenCalled();
  });

  it("suppresses stale notifications and bounds exponential retry delay", async () => {
    const stale = { ...readyItem, reservationStatus: "CANCELLED" as const };
    const deps = dependencies([stale]);
    await expect(deliverReservationOutbox(20, deps)).resolves.toMatchObject({ skipped: 1 });
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.complete).toHaveBeenCalledWith(stale, null);
    expect(retryDelayMinutes(1)).toBe(5);
    expect(retryDelayMinutes(20)).toBe(360);
    expect(deliveryFailureDisposition(7)).toBe("retried");
    expect(deliveryFailureDisposition(8)).toBe("dead-lettered");
  });

  it("reports permanent failures as dead letters", async () => {
    const deps = dependencies([{ ...readyItem, attemptCount: 8 }]);
    deps.send.mockRejectedValueOnce(new Error("provider rejected"));
    deps.retry.mockResolvedValueOnce("dead-lettered");
    await expect(deliverReservationOutbox(20, deps)).resolves.toMatchObject({
      retried: 0,
      deadLettered: 1,
    });
  });
});
