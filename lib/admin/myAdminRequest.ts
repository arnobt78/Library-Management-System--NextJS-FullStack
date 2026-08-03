/**
 * Current-user admin request status for /make-admin SSR.
 * Latest row by createdAt — PENDING blocks resubmit; REJECTED allows resubmit.
 */

import { db } from "@/database/drizzle";
import { adminRequests, users } from "@/database/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuthenticatedActor } from "@/lib/auth/authorization";

export type MyAdminRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MyAdminRequest = {
  id: string;
  status: MyAdminRequestStatus;
  requestReason: string;
  rejectionReason: string | null;
  createdAt: Date | null;
};

export type MyAdminRequestPageData = {
  userId: string;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
  latestRequest: MyAdminRequest | null;
};

/**
 * Load the signed-in user's role + latest admin_requests row for the make-admin page.
 */
export async function getMyAdminRequestPageData(): Promise<MyAdminRequestPageData> {
  const actor = await requireAuthenticatedActor();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, actor.id))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const [latest] = await db
    .select({
      id: adminRequests.id,
      status: adminRequests.status,
      requestReason: adminRequests.requestReason,
      rejectionReason: adminRequests.rejectionReason,
      createdAt: adminRequests.createdAt,
    })
    .from(adminRequests)
    .where(eq(adminRequests.userId, actor.id))
    .orderBy(desc(adminRequests.createdAt))
    .limit(1);

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role === "ADMIN" ? "ADMIN" : "USER",
    latestRequest: latest
      ? {
          id: latest.id,
          status: latest.status as MyAdminRequestStatus,
          requestReason: latest.requestReason,
          rejectionReason: latest.rejectionReason ?? null,
          createdAt: latest.createdAt,
        }
      : null,
  };
}
