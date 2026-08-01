// Parent: REQ-0030
import "server-only";

import { after } from "next/server";
import { deliverReservationOutbox } from "@/lib/circulation/reservationOutbox";

/** Dispatches after the response; the secured cron route recovers interrupted runs. */
export function scheduleReservationOutboxDelivery(): void {
  after(async () => {
    try {
      await deliverReservationOutbox();
    } catch {
      console.error("Reservation outbox delivery failed");
    }
  });
}
