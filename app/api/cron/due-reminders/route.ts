/**
 * Daily due-soon + overdue reminder cron (email + in-app REMINDER_DUE).
 * Auth mirrors reservation-notifications (Bearer CRON_SECRET).
 * Parent: REQ-0032 / Phase A Wave 3
 */
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  sendDueSoonReminders,
  sendOverdueReminders,
} from "@/lib/admin/actions/reminders";
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
    const [dueSoon, overdue] = await Promise.all([
      sendDueSoonReminders(),
      sendOverdueReminders(),
    ]);
    // Bell shells: REMINDER_DUE rows may have been inserted (paths empty today; keep domain wired).
    revalidateMutationPaths("notification.write");
    return NextResponse.json({
      success: true,
      dueSoonSent: dueSoon.filter((r) => r.status === "sent").length,
      dueSoonFailed: dueSoon.filter((r) => r.status === "failed").length,
      overdueSent: overdue.filter((r) => r.status === "sent").length,
      overdueFailed: overdue.filter((r) => r.status === "failed").length,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Reminder dispatch unavailable" },
      { status: 503 },
    );
  }
}
