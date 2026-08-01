"use server";

import { db } from "@/database/drizzle";
import { adminRequests, users } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  getActionErrorMessage,
  requireAdminActor,
  requireAuthenticatedActor,
} from "@/lib/auth/authorization";
import {
  adminRequestReasonSchema,
  parseEntityId,
} from "@/lib/actionInputs";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";

export interface AdminRequest {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  requestReason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy: string | null | undefined;
  reviewedAt: Date | null | undefined;
  rejectionReason: string | null | undefined;
  createdAt: Date | null;
  updatedAt: Date | null;
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

      const [fullRequest] = await tx
        .select({
          id: adminRequests.id,
          userId: adminRequests.userId,
          userEmail: users.email,
          userFullName: users.fullName,
          requestReason: adminRequests.requestReason,
          status: adminRequests.status,
          reviewedBy: adminRequests.reviewedBy,
          reviewedAt: adminRequests.reviewedAt,
          rejectionReason: adminRequests.rejectionReason,
          createdAt: adminRequests.createdAt,
          updatedAt: adminRequests.updatedAt,
        })
        .from(adminRequests)
        .innerJoin(users, eq(adminRequests.userId, users.id))
        .where(eq(adminRequests.id, newRequest.id))
        .limit(1);

      return { success: true, data: fullRequest };
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
    const requests = await db
      .select({
        id: adminRequests.id,
        userId: adminRequests.userId,
        userEmail: users.email,
        userFullName: users.fullName,
        requestReason: adminRequests.requestReason,
        status: adminRequests.status,
        reviewedBy: adminRequests.reviewedBy,
        reviewedAt: adminRequests.reviewedAt,
        rejectionReason: adminRequests.rejectionReason,
        createdAt: adminRequests.createdAt,
        updatedAt: adminRequests.updatedAt,
      })
      .from(adminRequests)
      .innerJoin(users, eq(adminRequests.userId, users.id))
      .orderBy(desc(adminRequests.createdAt));

    return {
      success: true,
      data: requests,
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
    const requests = await db
      .select({
        id: adminRequests.id,
        userId: adminRequests.userId,
        userEmail: users.email,
        userFullName: users.fullName,
        requestReason: adminRequests.requestReason,
        status: adminRequests.status,
        reviewedBy: adminRequests.reviewedBy,
        reviewedAt: adminRequests.reviewedAt,
        rejectionReason: adminRequests.rejectionReason,
        createdAt: adminRequests.createdAt,
        updatedAt: adminRequests.updatedAt,
      })
      .from(adminRequests)
      .innerJoin(users, eq(adminRequests.userId, users.id))
      .where(eq(adminRequests.status, "PENDING"))
      .orderBy(desc(adminRequests.createdAt));

    return {
      success: true,
      data: requests,
    };
  } catch (error) {
    console.error("Error fetching pending admin requests:", error);
    return {
      success: false,
      error: "Failed to fetch pending admin requests",
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

      const [fullRequest] = await tx
        .select({
          id: adminRequests.id,
          userId: adminRequests.userId,
          userEmail: users.email,
          userFullName: users.fullName,
          requestReason: adminRequests.requestReason,
          status: adminRequests.status,
          reviewedBy: adminRequests.reviewedBy,
          reviewedAt: adminRequests.reviewedAt,
          rejectionReason: adminRequests.rejectionReason,
          createdAt: adminRequests.createdAt,
          updatedAt: adminRequests.updatedAt,
        })
        .from(adminRequests)
        .innerJoin(users, eq(adminRequests.userId, users.id))
        .where(eq(adminRequests.id, safeRequestId))
        .limit(1);

      return { success: true, data: fullRequest };
    });
    if (result.success) revalidateMutationPaths("admin-request.write");
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
          rejectionReason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(adminRequests.id, safeRequestId),
            eq(adminRequests.status, "PENDING")
          )
        );

      const [fullRequest] = await tx
        .select({
          id: adminRequests.id,
          userId: adminRequests.userId,
          userEmail: users.email,
          userFullName: users.fullName,
          requestReason: adminRequests.requestReason,
          status: adminRequests.status,
          reviewedBy: adminRequests.reviewedBy,
          reviewedAt: adminRequests.reviewedAt,
          rejectionReason: adminRequests.rejectionReason,
          createdAt: adminRequests.createdAt,
          updatedAt: adminRequests.updatedAt,
        })
        .from(adminRequests)
        .innerJoin(users, eq(adminRequests.userId, users.id))
        .where(eq(adminRequests.id, safeRequestId))
        .limit(1);

      return { success: true, data: fullRequest };
    });
    if (result.success) revalidateMutationPaths("admin-request.write");
    return result;
  } catch (error) {
    console.error("Error rejecting admin request:", error);
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to reject admin request"),
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
