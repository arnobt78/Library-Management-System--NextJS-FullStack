"use server";

import { db } from "@/database/drizzle";
import { users, userStatusDecisions } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { after } from "next/server";
import {
  getActionErrorMessage,
  requireAdminActor,
} from "@/lib/auth/authorization";
import { parseEntityId } from "@/lib/actionInputs";
import {
  DEFAULT_ACCOUNT_REJECTION_REASON,
  notifyAccountStatusDecision,
} from "@/lib/admin/accountStatusEmails";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { isProtectedDemoAccount } from "@/constants";

const DEMO_ACCOUNT_LOCKED =
  "Demo showcase accounts cannot change role or status";

export const updateUserRole = async (
  userId: string,
  role: "USER" | "ADMIN",
) => {
  try {
    const actor = await requireAdminActor();
    const safeUserId = parseEntityId(userId);

    const existing = await db
      .select({
        id: users.id,
        email: users.email,
        universityId: users.universityId,
      })
      .from(users)
      .where(eq(users.id, safeUserId))
      .limit(1);

    if (existing.length !== 1) {
      return { success: false, error: "User not found" };
    }

    if (isProtectedDemoAccount(existing[0])) {
      return { success: false, error: DEMO_ACCOUNT_LOCKED };
    }

    const updated = await db
      .update(users)
      .set({ role, updatedAt: new Date(), updatedBy: actor.email })
      .where(eq(users.id, safeUserId))
      .returning({ id: users.id });

    if (updated.length !== 1) {
      return { success: false, error: "User not found" };
    }

    revalidateMutationPaths("user.write");
    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to update user role"),
    };
  }
};

export const updateUserStatus = async (
  userId: string,
  status: "PENDING" | "APPROVED" | "REJECTED",
) => {
  try {
    const actor = await requireAdminActor();
    const safeUserId = parseEntityId(userId);

    const existing = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        universityId: users.universityId,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, safeUserId))
      .limit(1);

    if (existing.length !== 1) {
      return { success: false, error: "User not found" };
    }

    if (isProtectedDemoAccount(existing[0])) {
      return { success: false, error: DEMO_ACCOUNT_LOCKED };
    }

    const previousStatus = existing[0].status;
    const decidedAt = new Date();

    // Persist durable signup decision actor separately from updatedBy (role edits).
    const statusReviewPatch =
      status === "APPROVED" || status === "REJECTED"
        ? {
            statusReviewedBy: actor.id,
            statusReviewedAt: decidedAt,
          }
        : {
            statusReviewedBy: null,
            statusReviewedAt: null,
          };

    // Atomic user stamp + ledger insert so Recent decisions survive re-apply.
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(users)
        .set({
          status,
          updatedAt: decidedAt,
          updatedBy: actor.email,
          ...statusReviewPatch,
        })
        .where(eq(users.id, safeUserId))
        .returning({ id: users.id });

      if (updated.length !== 1) {
        throw new Error("User not found");
      }

      if (
        previousStatus !== status &&
        (status === "APPROVED" || status === "REJECTED")
      ) {
        await tx.insert(userStatusDecisions).values({
          userId: safeUserId,
          decision: status,
          decidedBy: actor.id,
          decidedAt,
        });
      }
    });

    revalidateMutationPaths("user.write");

    // Notify on APPROVED/REJECTED transitions only (not PENDING, not no-ops).
    if (
      previousStatus !== status &&
      (status === "APPROVED" || status === "REJECTED")
    ) {
      const target = existing[0];
      after(async () => {
        await notifyAccountStatusDecision({
          to: target.email,
          fullName: target.fullName,
          status,
          userId: target.id,
          decidedAt,
          decidedBy: { fullName: actor.name, email: actor.email },
          rejectionReason:
            status === "REJECTED" ? DEFAULT_ACCOUNT_REJECTION_REASON : null,
        });
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user status:", error);
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to update user status"),
    };
  }
};

export const getAllUsers = async () => {
  try {
    await requireAdminActor();
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    return { success: true, data: allUsers };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Failed to fetch users" };
  }
};
