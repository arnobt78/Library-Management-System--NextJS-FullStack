"use server";

import { db } from "@/database/drizzle";
import { adminRequests, users } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";

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
  userId: string,
  requestReason: string
): Promise<CreateAdminRequestResult> {
  try {
    // Check if user already has a pending admin request
    const existingRequest = await db
      .select()
      .from(adminRequests)
      .where(
        and(
          eq(adminRequests.userId, userId),
          eq(adminRequests.status, "PENDING")
        )
      )
      .limit(1);

    if (existingRequest.length > 0) {
      return {
        success: false,
        error: "You already have a pending admin request",
      };
    }

    // Check if user is already an admin
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return {
        success: false,
        error: "User not found",
      };
    }

    if (user[0].role === "ADMIN") {
      return {
        success: false,
        error: "You are already an admin",
      };
    }

    // Create the admin request
    const newRequest = await db
      .insert(adminRequests)
      .values({
        userId,
        requestReason,
        status: "PENDING",
      })
      .returning();

    // Get the full request with user details
    const fullRequest = await db
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
      .where(eq(adminRequests.id, newRequest[0].id))
      .limit(1);

    return {
      success: true,
      data: fullRequest[0],
    };
  } catch (error) {
    console.error("Error creating admin request:", error);
    return {
      success: false,
      error: "Failed to create admin request",
    };
  }
}

// Get all admin requests (including approved and rejected)
export async function getAllAdminRequests(): Promise<GetAdminRequestsResult> {
  try {
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
  requestId: string,
  reviewedBy: string
): Promise<UpdateAdminRequestResult> {
  try {
    // Get the request
    const request = await db
      .select()
      .from(adminRequests)
      .where(eq(adminRequests.id, requestId))
      .limit(1);

    if (request.length === 0) {
      return {
        success: false,
        error: "Admin request not found",
      };
    }

    if (request[0].status !== "PENDING") {
      return {
        success: false,
        error: "This request has already been processed",
      };
    }

    // Update the user's role to ADMIN
    await db
      .update(users)
      .set({ role: "ADMIN" })
      .where(eq(users.id, request[0].userId));

    // Update the admin request status
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _updatedRequest = await db
      .update(adminRequests)
      .set({
        status: "APPROVED",
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(adminRequests.id, requestId))
      .returning();

    // Get the full updated request with user details
    const fullRequest = await db
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
      .where(eq(adminRequests.id, requestId))
      .limit(1);

    return {
      success: true,
      data: fullRequest[0],
    };
  } catch (error) {
    console.error("Error approving admin request:", error);
    return {
      success: false,
      error: "Failed to approve admin request",
    };
  }
}

// Reject an admin request
export async function rejectAdminRequest(
  requestId: string,
  reviewedBy: string,
  rejectionReason?: string
): Promise<UpdateAdminRequestResult> {
  try {
    // Get the request
    const request = await db
      .select()
      .from(adminRequests)
      .where(eq(adminRequests.id, requestId))
      .limit(1);

    if (request.length === 0) {
      return {
        success: false,
        error: "Admin request not found",
      };
    }

    if (request[0].status !== "PENDING") {
      return {
        success: false,
        error: "This request has already been processed",
      };
    }

    // Update the admin request status
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _updatedRequest = await db
      .update(adminRequests)
      .set({
        status: "REJECTED",
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason,
      })
      .where(eq(adminRequests.id, requestId))
      .returning();

    // Get the full updated request with user details
    const fullRequest = await db
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
      .where(eq(adminRequests.id, requestId))
      .limit(1);

    return {
      success: true,
      data: fullRequest[0],
    };
  } catch (error) {
    console.error("Error rejecting admin request:", error);
    return {
      success: false,
      error: "Failed to reject admin request",
    };
  }
}

// Remove admin privileges from a user
export async function removeAdminPrivileges(
  userId: string,
  _removedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user exists and is an admin
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
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
    await db.update(users).set({ role: "USER" }).where(eq(users.id, userId));

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error removing admin privileges:", error);
    return {
      success: false,
      error: "Failed to remove admin privileges",
    };
  }
}
