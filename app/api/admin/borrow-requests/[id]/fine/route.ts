import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import {
  adjustBorrowFine,
  markFinePaid,
  waiveBorrowFine,
} from "@/lib/admin/actions/fines";

export const runtime = "nodejs";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("adjust"),
    amount: z.number().min(0),
    reason: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("waive"),
    reason: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("paid"),
    reason: z.string().max(500).optional(),
  }),
]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeAdminRoute();
  if (!authorization.ok) return authorization.response;

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  let result;
  if (payload.action === "adjust") {
    result = await adjustBorrowFine(id, payload.amount, payload.reason);
  } else if (payload.action === "waive") {
    result = await waiveBorrowFine(id, payload.reason);
  } else {
    result = await markFinePaid(id, payload.reason);
  }

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
