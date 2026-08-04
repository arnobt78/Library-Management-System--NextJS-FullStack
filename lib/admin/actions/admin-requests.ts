"use server";

/**
 * Admin-request server actions: create / list / approve / reject / cancel.
 * List payloads left-join reviewer (reviewedBy) for attribution on admin UI + /make-admin.
 */

import { db } from "@/database/drizzle";
import { adminRequests, users } from "@/database/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  getActionErrorMessage,
  requireAdminActor,
  requireAuthenticatedActor,
} from "@/lib/auth/authorization";
import { after } from "next/server";
import {
  adminRejectionReasonSchema,
  adminRequestReasonSchema,
  parseEntityId,
} from "@/lib/actionInputs";
import {
  ADMIN_REQUEST_WITHDRAWN_REASON,
  RECENT_ADMIN_REQUEST_DECISIONS_LIMIT,
} from "@/lib/admin/adminRequestConstants";
import { notifyAdminRequestDecision } from "@/lib/admin/adminRequestEmails";
import type {
  AdminRequestReviewer,
  AdminRequestStatus,
} from "@/lib/admin/adminRequestTypes";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { isProtectedDemoAccount } from "@/constants";

/** Non-blocking applicant email after approve/reject (failures never fail the action). */
function scheduleAdminRequestDecisionEmail(
  data: AdminRequest | undefined,
): void {
  if (!data?.userEmail) return;
  if (data.status !== "APPROVED" && data.status !== "REJECTED") return;

  const decision: "APPROVED" | "REJECTED" = data.status;

  after(async () => {
    await notifyAdminRequestDecision({
      to: data.userEmail,
      fullName: data.userFullName,
      status: decision,
      requestId: data.id,
      reviewedAt: data.reviewedAt,
      rejectionReason:
        decision === "REJECTED" ? data.rejectionReason : null,
    });
  });
}

const applicantUsers = users;
const reviewerUsers = alias(users, "admin_request_reviewer");

export interface AdminRequest {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  requestReason: string;
  status: AdminRequestStatus;
  reviewedBy: string | null | undefined;
  reviewedAt: Date | null | undefined;
  rejectionReason: string | null | undefined;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** Null while PENDING or when reviewer row is missing (legacy). */
  reviewer: AdminRequestReviewer | null;
}

export interface CreateAdminRequestResult {
  success: boolean;
  error?: string;
  data?: AdminRequest;
}

export interface GetAdminRequestsResult {
  success: boolean;
  error?: string;
  data?: AdminRequest[];
}

export interface UpdateAdminRequestResult {
  success: boolean;
  error?: string;
  data?: AdminRequest;
}

type AdminRequestSelectRow = {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  requestReason: string;
  status: AdminRequestStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  reviewerFullName: string | null;
  reviewerEmail: string | null;
  reviewerUniversityCard: string | null;
};

const adminRequestSelect = {
  id: adminRequests.id,
  userId: adminRequests.userId,
  userEmail: applicantUsers.email,
  userFullName: applicantUsers.fullName,
  requestReason: adminRequests.requestReason,
  status: adminRequests.status,
  reviewedBy: adminRequests.reviewedBy,
  reviewedAt: adminRequests.reviewedAt,
  rejectionReason: adminRequests.rejectionReason,
  createdAt: adminRequests.createdAt,
  updatedAt: adminRequests.updatedAt,
  reviewerFullName: reviewerUsers.fullName,
  reviewerEmail: reviewerUsers.email,
  reviewerUniversityCard: reviewerUsers.universityCard,
};

function mapReviewer(row: AdminRequestSelectRow): AdminRequestReviewer | null {
  if (!row.reviewerEmail || !row.reviewerFullName) return null;
  return {
    fullName: row.reviewerFullName,
    email: row.reviewerEmail,
    universityCard: row.reviewerUniversityCard ?? null,
  };
}

function mapAdminRequest(row: AdminRequestSelectRow): AdminRequest {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    userFullName: row.userFullName,
    requestReason: row.requestReason,
    status: row.status as AdminRequestStatus,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reviewer: mapReviewer(row),
  };
}

/** Accepts db or transaction (both expose compatible `.select`). */
async function selectAdminRequestById(
  executor: Pick<typeof db, "select">,
  requestId: string,
): Promise<AdminRequest | undefined> {
  const [row] = await executor
    .select(adminRequestSelect)
    .from(adminRequests)
    .innerJoin(applicantUsers, eq(adminRequests.userId, applicantUsers.id))
    .leftJoin(reviewerUsers, eq(adminRequests.reviewedBy, reviewerUsers.id))
    .where(eq(adminRequests.id, requestId))
    .limit(1);

  return row ? mapAdminRequest(row as AdminRequestSelectRow) : undefined;
}

// Create a new admin request
export async function createAdminRequest(
  requestReason: string
): Promise<CreateAdminRequestResult> {
  try {
    const actor = await requireAuthenticatedActor();
    const safeReason = adminRequestReasonSchema.parse(requestReason);

    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, actor.id))
        .limit(1)
        .for("update");

      if (!user) {
        return { success: false, error: "User not found" };
      }
      if (user.role === "ADMIN") {
        return { success: false, error: "You are already an admin" };
      }

      const [existingRequest] = await tx
        .select({ id: adminRequests.id })
        .from(adminRequests)
        .where(
          and(
            eq(adminRequests.userId, actor.id),
            eq(adminRequests.status, "PENDING")
          )
        )
        .limit(1);

      if (existingRequest) {
        return {
          success: false,
          error: "You already have a pending admin request",
        };
      }

      const [newRequest] = await tx
        .insert(adminRequests)
        .values({
          userId: actor.id,
          requestReason: safeReason,
          status: "PENDING",
        })
        .returning({ id: adminRequests.id });

      const fullRequest = await selectAdminRequestById(tx, newRequest.id);
      return { success: true as const, data: fullRequest };
    });
    if (result.success) revalidateMutationPaths("admin-request.write");
    return result;
  } catch (error) {
    console.error("Error creating admin request:", error);
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to create admin request"),
    };
  }
}

// Get all admin requests (including approved and rejected)
export async function getAllAdminRequests(): Promise<GetAdminRequestsResult> {
  try {
    await requireAdminActor();
    const rows = await db
      .select(adminRequestSelect)
      .from(adminRequests)
      .innerJoin(applicantUsers, eq(adminRequests.userId, applicantUsers.id))
      .leftJoin(reviewerUsers, eq(adminRequests.reviewedBy, reviewerUsers.id))
      .orderBy(desc(adminRequests.createdAt));

    return {
      success: true,
      data: rows.map((row) => mapAdminRequest(row as AdminRequestSelectRow)),
    };
  } catch (error) {
    console.error("Error fetching admin requests:", error);
    return {
      success: false,
      error: "Failed to fetch admin requests",
    };
  }
}

// Get only pending admin requests
export async function getPendingAdminRequests(): Promise<GetAdminRequestsResult> {
  try {
    await requireAdminActor();
    const rows = await db
      .select(adminRequestSelect)
      .from(adminRequests)
      .innerJoin(applicantUsers, eq(adminRequests.userId, applicantUsers.id))
      .leftJoin(reviewerUsers, eq(adminRequests.reviewedBy, reviewerUsers.id))
      .where(eq(adminRequests.status, "PENDING"))
      .orderBy(desc(adminRequests.createdAt));

    return {
      success: true,
      data: rows.map((row) => mapAdminRequest(row as AdminRequestSelectRow)),
    };
  } catch (error) {
    console.error("Error fetching pending admin requests:", error);
    return {
      success: false,
      error: "Failed to fetch pending admin requests",
    };
  }
}

/**
 * Recent APPROVED/REJECTED decisions for admin history UI (reviewer attribution).
 */
export async function getRecentAdminRequestDecisions(
  limit: number = RECENT_ADMIN_REQUEST_DECISIONS_LIMIT,
): Promise<GetAdminRequestsResult> {
  try {
    await requireAdminActor();
    const safeLimit = Math.min(
      Math.max(1, Math.floor(limit)),
      RECENT_ADMIN_REQUEST_DECISIONS_LIMIT,
    );

    const rows = await db
      .select(adminRequestSelect)
      .from(adminRequests)
      .innerJoin(applicantUsers, eq(adminRequests.userId, applicantUsers.id))
      .leftJoin(reviewerUsers, eq(adminRequests.reviewedBy, reviewerUsers.id))
      .where(inArray(adminRequests.status, ["APPROVED", "REJECTED"]))
      .orderBy(desc(adminRequests.reviewedAt))
      .limit(safeLimit);

    return {
      success: true,
      data: rows.map((row) => mapAdminRequest(row as AdminRequestSelectRow)),
    };
  } catch (error) {
    console.error("Error fetching admin request decisions:", error);
    return {
      success: false,
      error: "Failed to fetch admin request decisions",
    };
  }
}

// Approve an admin request
export async function approveAdminRequest(
  requestId: string
): Promise<UpdateAdminRequestResult> {
  try {
    const actor = await requireAdminActor();
    const safeRequestId = parseEntityId(requestId);

    const result = await db.transaction(async (tx) => {
      const [request] = await tx
        .select({ userId: adminRequests.userId, status: adminRequests.status })
        .from(adminRequests)
        .where(eq(adminRequests.id, safeRequestId))
        .limit(1)
        .for("update");

      if (!request) {
        return { success: false, error: "Admin request not found" };
      }
      if (request.status !== "PENDING") {
        return {
          success: false,
          error: "This request has already been processed",
        };
      }

      // Seed showcase accounts may request for demo, but must not be promoted.
      const [applicant] = await tx
        .select({
          email: users.email,
          universityId: users.universityId,
        })
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);

      if (!applicant) {
        return { success: false, error: "User not found" };
      }

      if (isProtectedDemoAccount(applicant)) {
        return {
          success: false,
          error: "Demo showcase accounts cannot be promoted to admin",
        };
      }

      await tx
        .update(users)
        .set({
          role: "ADMIN",
          updatedAt: new Date(),
          updatedBy: actor.email,
        })
        .where(eq(users.id, request.userId));

      await tx
        .update(adminRequests)
        .set({
          status: "APPROVED",
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(adminRequests.id, safeRequestId),
            eq(adminRequests.status, "PENDING")
          )
        );

      const fullRequest = await selectAdminRequestById(tx, safeRequestId);
      return { success: true as const, data: fullRequest };
    });
    if (result.success) {
      revalidateMutationPaths("admin-request.write");
      scheduleAdminRequestDecisionEmail(result.data);
    }
    return result;
  } catch (error) {
    console.error("Error approving admin request:", error);
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to approve admin request"),
    };
  }
}

// Reject an admin request
export async function rejectAdminRequest(
  requestId: string,
  rejectionReason?: string
): Promise<UpdateAdminRequestResult> {
  try {
    const actor = await requireAdminActor();
    const safeRequestId = parseEntityId(requestId);
    const safeRejectionReason = adminRejectionReasonSchema.parse(
      rejectionReason,
    );

    const result = await db.transaction(async (tx) => {
      const [request] = await tx
        .select({ status: adminRequests.status })
        .from(adminRequests)
        .where(eq(adminRequests.id, safeRequestId))
        .limit(1)
        .for("update");

      if (!request) {
        return { success: false, error: "Admin request not found" };
      }
      if (request.status !== "PENDING") {
        return {
          success: false,
          error: "This request has already been processed",
        };
      }

      await tx
        .update(adminRequests)
        .set({
          status: "REJECTED",
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          rejectionReason: safeRejectionReason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(adminRequests.id, safeRequestId),
            eq(adminRequests.status, "PENDING")
          )
        );

      const fullRequest = await selectAdminRequestById(tx, safeRequestId);
      return { success: true as const, data: fullRequest };
    });
    if (result.success) {
      revalidateMutationPaths("admin-request.write");
      scheduleAdminRequestDecisionEmail(result.data);
    }
    return result;
  } catch (error) {
    console.error("Error rejecting admin request:", error);
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to reject admin request"),
    };
  }
}

/**
 * Applicant cancels their own PENDING admin request.
 * Marks REJECTED with Withdrawn-by-applicant for audit; create still only blocks PENDING.
 */
export async function cancelMyAdminRequest(
  requestId: string,
): Promise<UpdateAdminRequestResult> {
  try {
    const actor = await requireAuthenticatedActor();
    const safeRequestId = parseEntityId(requestId);

    const result = await db.transaction(async (tx) => {
      const [request] = await tx
        .select({
          id: adminRequests.id,
          userId: adminRequests.userId,
          status: adminRequests.status,
        })
        .from(adminRequests)
        .where(eq(adminRequests.id, safeRequestId))
        .limit(1)
        .for("update");

      if (!request) {
        return { success: false, error: "Admin request not found" };
      }
      if (request.userId !== actor.id) {
        return {
          success: false,
          error: "You can only cancel your own admin request",
        };
      }
      if (request.status !== "PENDING") {
        return {
          success: false,
          error: "Only pending requests can be cancelled",
        };
      }

      await tx
        .update(adminRequests)
        .set({
          status: "REJECTED",
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          rejectionReason: ADMIN_REQUEST_WITHDRAWN_REASON,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(adminRequests.id, safeRequestId),
            eq(adminRequests.status, "PENDING"),
            eq(adminRequests.userId, actor.id),
          ),
        );

      const fullRequest = await selectAdminRequestById(tx, safeRequestId);
      return { success: true as const, data: fullRequest };
    });

    if (result.success) revalidateMutationPaths("admin-request.write");
    return result;
  } catch (error) {
    console.error("Error cancelling admin request:", error);
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to cancel admin request"),
    };
  }
}

// Remove admin privileges from a user
export async function removeAdminPrivileges(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await requireAdminActor();
    const safeUserId = parseEntityId(userId);
    // Check if user exists and is an admin
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, safeUserId))
      .limit(1);

    if (user.length === 0) {
      return {
        success: false,
        error: "User not found",
      };
    }

    if (user[0].role !== "ADMIN") {
      return {
        success: false,
        error: "User is not an admin",
      };
    }

    // Seed showcase admin must stay ADMIN for demos.
    if (isProtectedDemoAccount(user[0])) {
      return {
        success: false,
        error: "Demo showcase accounts cannot change role or status",
      };
    }

    // Update the user's role to USER
    await db
      .update(users)
      .set({
        role: "USER",
        updatedAt: new Date(),
        updatedBy: actor.email,
      })
      .where(eq(users.id, safeUserId));

    revalidateMutationPaths("admin-request.write");
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error removing admin privileges:", error);
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to remove admin privileges"),
    };
  }
}
