/**
 * Current-user admin request status for /make-admin SSR.
 * Latest row by createdAt — PENDING blocks resubmit; REJECTED allows resubmit.
 * Joins reviewer (reviewedBy) for admin-reject attribution on the client form.
 */

import { db } from "@/database/drizzle";
import { adminRequests, users } from "@/database/schema";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuthenticatedActor } from "@/lib/auth/authorization";
import type {
  AdminRequestReviewer,
  AdminRequestStatus,
} from "@/lib/admin/adminRequestTypes";

export type MyAdminRequestStatus = AdminRequestStatus;
export type MyAdminRequestReviewer = AdminRequestReviewer;

export type MyAdminRequest = {
  id: string;
  status: MyAdminRequestStatus;
  requestReason: string;
  rejectionReason: string | null;
  /** When the applicant submitted the request */
  createdAt: Date | null;
  /** When approved / rejected / withdrawn (null while PENDING) */
  reviewedAt: Date | null;
  reviewer: MyAdminRequestReviewer | null;
};

export type MyAdminRequestPageData = {
  userId: string;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
  latestRequest: MyAdminRequest | null;
};

const reviewerUsers = alias(users, "admin_request_reviewer");

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
      reviewedAt: adminRequests.reviewedAt,
      reviewerFullName: reviewerUsers.fullName,
      reviewerEmail: reviewerUsers.email,
      reviewerUniversityCard: reviewerUsers.universityCard,
    })
    .from(adminRequests)
    .leftJoin(reviewerUsers, eq(adminRequests.reviewedBy, reviewerUsers.id))
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
          reviewedAt: latest.reviewedAt ?? null,
          reviewer:
            latest.reviewerEmail && latest.reviewerFullName
              ? {
                  fullName: latest.reviewerFullName,
                  email: latest.reviewerEmail,
                  universityCard: latest.reviewerUniversityCard ?? null,
                }
              : null,
        }
      : null,
  };
}
