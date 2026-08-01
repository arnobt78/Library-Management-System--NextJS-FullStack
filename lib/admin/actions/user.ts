"use server";

import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import {
  getActionErrorMessage,
  requireAdminActor,
} from "@/lib/auth/authorization";
import { parseEntityId } from "@/lib/actionInputs";

export const updateUserRole = async (
  userId: string,
  role: "USER" | "ADMIN"
) => {
  try {
    const actor = await requireAdminActor();
    const safeUserId = parseEntityId(userId);
    const updated = await db
      .update(users)
      .set({ role, updatedAt: new Date(), updatedBy: actor.email })
      .where(eq(users.id, safeUserId))
      .returning({ id: users.id });

    if (updated.length !== 1) {
      return { success: false, error: "User not found" };
    }

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
  status: "PENDING" | "APPROVED" | "REJECTED"
) => {
  try {
    const actor = await requireAdminActor();
    const safeUserId = parseEntityId(userId);
    const updated = await db
      .update(users)
      .set({ status, updatedAt: new Date(), updatedBy: actor.email })
      .where(eq(users.id, safeUserId))
      .returning({ id: users.id });

    if (updated.length !== 1) {
      return { success: false, error: "User not found" };
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
