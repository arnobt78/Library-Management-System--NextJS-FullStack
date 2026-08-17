/**
 * Nightly stamp of open overdue stored fine_amount (ACCRUING only).
 * Auth mirrors due-reminders (Bearer CRON_SECRET).
 */
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  stampOpenOverdueFines,
  syncOverdueAccruingStatus,
} from "@/lib/admin/actions/fines";
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
    const sync = await syncOverdueAccruingStatus();
    const result = await stampOpenOverdueFines({ actorEmail: "cron" });
    revalidateMutationPaths("fine.write");
    return NextResponse.json({ success: true, synced: sync.synced, ...result });
  } catch {
    return NextResponse.json(
      { success: false, error: "Stamp job unavailable" },
      { status: 503 },
    );
  }
}
