"use server";

import { db } from "@/database/drizzle";
import { users, userStatusDecisions } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
import { settlePendingOrInsertApprovedAdminRequest } from "@/lib/admin/adminPrivilegeLedger";
import { notifyAdminRequestDecision } from "@/lib/admin/adminRequestEmails";
import { removeAdminPrivileges } from "@/lib/admin/actions/admin-requests";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { isProtectedDemoAccount } from "@/constants";
import { logActivity } from "@/lib/admin/activityLog";

const DEMO_ACCOUNT_LOCKED =
  "Demo showcase accounts cannot change role or status";

/**
 * Change a user's role. ADMIN promote writes/settles admin_requests (same ledger as
 * /make-admin approve). USER demote delegates to removeAdminPrivileges so history settles.
 */
export const updateUserRole = async (
  userId: string,
  role: "USER" | "ADMIN",
) => {
  try {
    const safeUserId = parseEntityId(userId);

    // Single demote door — always revoke APPROVED ledger when present.
    if (role === "USER") {
      return removeAdminPrivileges(safeUserId);
    }

    const actor = await requireAdminActor();

    const existing = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        universityId: users.universityId,
        role: users.role,
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

    if (existing[0].role === "ADMIN") {
      return { success: false, error: "User is already an admin" };
    }

    const decidedAt = new Date();

    // Atomic role + admin_requests so All Users Make Admin matches approve path.
    const ledgerRequestId = await db.transaction(async (tx) => {
      const updated = await tx
        .update(users)
        .set({
          role: "ADMIN",
          updatedAt: decidedAt,
          updatedBy: actor.email,
        })
        .where(eq(users.id, safeUserId))
        .returning({ id: users.id });

      if (updated.length !== 1) {
        throw new Error("User not found");
      }

      return settlePendingOrInsertApprovedAdminRequest(tx, {
        userId: safeUserId,
        actorId: actor.id,
        now: decidedAt,
      });
    });

    // Persist audit row before RSC revalidate so Activity History refetch cannot race.
    await logActivity({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "admin-request",
      entityId: ledgerRequestId,
      details: { role: "ADMIN", status: "APPROVED", userId: safeUserId },
    });
    revalidateMutationPaths("admin-request.write");

    const target = existing[0];
    after(async () => {
      await notifyAdminRequestDecision({
        to: target.email,
        fullName: target.fullName,
        status: "APPROVED",
        requestId: ledgerRequestId,
        reviewedAt: decidedAt,
        decidedBy: { fullName: actor.name, email: actor.email },
        rejectionReason: null,
      });
    });

    // Client densify needs ledger id + applicant fields for Recent decisions.
    return {
      success: true,
      data: {
        requestId: ledgerRequestId,
        userId: safeUserId,
        userEmail: target.email,
        userFullName: target.fullName,
        decidedAt: decidedAt.toISOString(),
        reviewedBy: actor.id,
        reviewer: {
          id: actor.id,
          fullName: actor.name,
          email: actor.email,
          universityCard: null as string | null,
        },
      },
    };
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


    await logActivity({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "user",
      entityId: safeUserId,
      details: { status },
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
    const statusReviewer = alias(users, "status_reviewer");
    const allUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityId: users.universityId,
        universityCard: users.universityCard,
        status: users.status,
        role: users.role,
        lastActivityDate: users.lastActivityDate,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        statusReviewedAt: users.statusReviewedAt,
        statusReviewedBy: users.statusReviewedBy,
        statusReviewedById: users.statusReviewedBy,
        statusReviewedByName: statusReviewer.fullName,
        statusReviewedByEmail: statusReviewer.email,
        statusReviewedByUniversityCard: statusReviewer.universityCard,
      })
      .from(users)
      .leftJoin(statusReviewer, eq(users.statusReviewedBy, statusReviewer.id))
      .orderBy(desc(users.createdAt));

    return { success: true, data: allUsers };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Failed to fetch users" };
  }
};
