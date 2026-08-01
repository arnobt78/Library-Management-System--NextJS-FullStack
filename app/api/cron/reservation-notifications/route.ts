// Parent: REQ-0030, REQ-0032
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { deliverReservationOutbox } from "@/lib/circulation/reservationOutbox";
import { expireReadyReservations } from "@/lib/circulation/reservations";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!secret || !provided) return false;
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const expiredBooks = await expireReadyReservations();
    const result = await deliverReservationOutbox(50);
    if (expiredBooks > 0) revalidateMutationPaths("reservation.lifecycle");
    return NextResponse.json({ success: true, expiredBooks, ...result });
  } catch {
    return NextResponse.json(
      { success: false, error: "Reservation delivery unavailable" },
      { status: 503 },
    );
  }
}
