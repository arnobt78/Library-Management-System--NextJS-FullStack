// Parent: REQ-0030; TC-0048
import { beforeEach, describe, expect, it, vi } from "vitest";

const deliverReservationOutbox = vi.hoisted(() => vi.fn());
const expireReadyReservations = vi.hoisted(() => vi.fn());
const revalidateMutationPaths = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/circulation/reservationOutbox", () => ({
  deliverReservationOutbox,
}));
vi.mock("@/lib/circulation/reservations", () => ({ expireReadyReservations }));
vi.mock("@/lib/utils/revalidateMutation", () => ({ revalidateMutationPaths }));

import { GET } from "./route";

describe("reservation notification cron boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret-value";
    expireReadyReservations.mockResolvedValue(0);
  });

  it("fails closed before invoking the worker", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/cron/reservation-notifications",
      ) as never,
    );
    expect(response.status).toBe(401);
    expect(deliverReservationOutbox).not.toHaveBeenCalled();
    expect(expireReadyReservations).not.toHaveBeenCalled();
  });

  it("runs a bounded recovery batch for an authorized scheduler", async () => {
    deliverReservationOutbox.mockResolvedValue({
      claimed: 1,
      delivered: 1,
      retried: 0,
      skipped: 0,
    });
    const request = new Request(
      "http://localhost/api/cron/reservation-notifications",
      {
        headers: { authorization: "Bearer cron-secret-value" },
      },
    );
    const response = await GET(request as never);
    expect(response.status).toBe(200);
    expect(expireReadyReservations).toHaveBeenCalledOnce();
    expect(deliverReservationOutbox).toHaveBeenCalledWith(50);
  });

  it("invalidates reservation views after scheduled expiry", async () => {
    expireReadyReservations.mockResolvedValue(1);
    deliverReservationOutbox.mockResolvedValue({
      claimed: 0,
      delivered: 0,
      retried: 0,
      skipped: 0,
    });
    const request = new Request(
      "http://localhost/api/cron/reservation-notifications",
      {
        headers: { authorization: "Bearer cron-secret-value" },
      },
    );
    await GET(request as never);
    expect(revalidateMutationPaths).toHaveBeenCalledWith(
      "reservation.lifecycle",
    );
  });
});
