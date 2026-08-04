/**
 * Shared admin_requests ledger helpers for promote / demote.
 * Used inside DB transactions by updateUserRole, removeAdminPrivileges, and bulk role ops
 * so All Users “Make Admin” and /make-admin approve write the same history.
 *
 * Not a "use server" module — import only from server actions / lifecycle code.
 */

import { db } from "@/database/drizzle";
import { adminRequests } from "@/database/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  ADMIN_REQUEST_DIRECT_GRANT_REASON,
  ADMIN_REQUEST_REVOKED_REASON,
} from "@/lib/admin/adminRequestConstants";

/** Drizzle transaction or db handle (same query surface). */
export type AdminLedgerTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AdminLedgerActor = {
  userId: string;
  actorId: string;
  now: Date;
};

/**
 * On promote: approve the user's latest PENDING request, or insert a synthetic
 * APPROVED row (direct grant) when no pending application exists.
 * Returns the settled/inserted admin_requests.id for email / audit follow-up.
 */
export async function settlePendingOrInsertApprovedAdminRequest(
  tx: AdminLedgerTx,
  { userId, actorId, now }: AdminLedgerActor,
): Promise<string> {
  const [pending] = await tx
    .select({ id: adminRequests.id })
    .from(adminRequests)
    .where(
      and(eq(adminRequests.userId, userId), eq(adminRequests.status, "PENDING")),
    )
    .orderBy(desc(adminRequests.createdAt))
    .limit(1);

  if (pending) {
    await tx
      .update(adminRequests)
      .set({
        status: "APPROVED",
        reviewedBy: actorId,
        reviewedAt: now,
        updatedAt: now,
        rejectionReason: null,
      })
      .where(
        and(
          eq(adminRequests.id, pending.id),
          eq(adminRequests.status, "PENDING"),
        ),
      );
    return pending.id;
  }

  const [inserted] = await tx
    .insert(adminRequests)
    .values({
      userId,
      requestReason: ADMIN_REQUEST_DIRECT_GRANT_REASON,
      status: "APPROVED",
      reviewedBy: actorId,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: adminRequests.id });

  return inserted.id;
}

/**
 * On demote: settle the latest APPROVED make-admin row to REJECTED with the
 * shared revoke reason so /make-admin unlocks re-apply.
 */
export async function revokeLatestApprovedAdminRequest(
  tx: AdminLedgerTx,
  { userId, actorId, now }: AdminLedgerActor,
): Promise<string | null> {
  const [latestApproved] = await tx
    .select({ id: adminRequests.id })
    .from(adminRequests)
    .where(
      and(
        eq(adminRequests.userId, userId),
        eq(adminRequests.status, "APPROVED"),
      ),
    )
    .orderBy(desc(adminRequests.createdAt))
    .limit(1);

  if (!latestApproved) {
    return null;
  }

  await tx
    .update(adminRequests)
    .set({
      status: "REJECTED",
      rejectionReason: ADMIN_REQUEST_REVOKED_REASON,
      reviewedBy: actorId,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(adminRequests.id, latestApproved.id));

  return latestApproved.id;
}
