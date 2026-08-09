"use server";

/**
 * Self-service student registration re-apply: REJECTED → PENDING.
 * Mirrors make-admin "submit again after reject" without touching admin_requests.
 */

import { eq } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import {
  getActionErrorMessage,
  requireSignedInActor,
} from "@/lib/auth/authorization";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { logActivity } from "@/lib/admin/activityLog";

/**
 * Rejected applicants can request librarian review again.
 * Clears durable statusReviewed* for the current cycle notice UX.
 * Append-only user_status_decisions ledger rows are kept (admin Recent decisions).
 */
export async function requestRegistrationReview(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const actor = await requireSignedInActor();

    const [row] = await db
      .select({
        id: users.id,
        status: users.status,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, actor.id))
      .limit(1);

    if (!row) {
      return { success: false, error: "User not found" };
    }

    if (row.status !== "REJECTED") {
      return {
        success: false,
        error:
          row.status === "PENDING"
            ? "Your registration is already awaiting approval"
            : "Only rejected accounts can request approval again",
      };
    }

    const now = new Date();
    const updated = await db
      .update(users)
      .set({
        status: "PENDING",
        statusReviewedBy: null,
        statusReviewedAt: null,
        updatedAt: now,
        updatedBy: actor.email,
      })
      .where(eq(users.id, actor.id))
      .returning({ id: users.id });

    if (updated.length !== 1) {
      return { success: false, error: "Failed to update registration status" };
    }

    await logActivity({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "user",
      entityId: actor.id,
      details: { status: "PENDING" },
    });
    revalidateMutationPaths("user.write");
    return { success: true };
  } catch (error) {
    console.error("Error requesting registration review:", error);
    return {
      success: false,
      error: getActionErrorMessage(
        error,
        "Failed to request registration review",
      ),
    };
  }
}
