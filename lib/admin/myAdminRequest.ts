/**
 * Current-user admin request status for /make-admin SSR.
 * Uses requireSignedInActor so PENDING/REJECTED can view a locked page.
 * Joins make-admin reviewer (reviewedBy) + signup decision actor (statusReviewedBy).
 */

import { db } from "@/database/drizzle";
import { adminRequests, users } from "@/database/schema";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  getAuthorizationFailure,
  requireSignedInActor,
  type ActorStatus,
} from "@/lib/auth/authorization";
import type {
  AdminRequestReviewer,
  AdminRequestStatus,
  SignupApprovalInfo,
} from "@/lib/admin/adminRequestTypes";

export type MyAdminRequestStatus = AdminRequestStatus;
export type MyAdminRequestReviewer = AdminRequestReviewer;
export type { SignupApprovalInfo };

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
  accountStatus: ActorStatus;
  signupApproval: SignupApprovalInfo;
  latestRequest: MyAdminRequest | null;
};

const reviewerUsers = alias(users, "admin_request_reviewer");
const signupDecisionUsers = alias(users, "signup_decision_actor");

/**
 * Load the signed-in user's account + latest admin_requests for /make-admin.
 * Throws AuthorizationError UNAUTHENTICATED when no session.
 */
export async function getMyAdminRequestPageData(): Promise<MyAdminRequestPageData> {
  const actor = await requireSignedInActor();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      statusReviewedAt: users.statusReviewedAt,
      actorFullName: signupDecisionUsers.fullName,
      actorEmail: signupDecisionUsers.email,
      actorUniversityCard: signupDecisionUsers.universityCard,
    })
    .from(users)
    .leftJoin(
      signupDecisionUsers,
      eq(users.statusReviewedBy, signupDecisionUsers.id),
    )
    .where(eq(users.id, actor.id))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const accountStatus: ActorStatus =
    user.status === "APPROVED" ||
    user.status === "PENDING" ||
    user.status === "REJECTED"
      ? user.status
      : "PENDING";

  const decisionActor: AdminRequestReviewer | null =
    (accountStatus === "APPROVED" || accountStatus === "REJECTED") &&
    user.actorEmail &&
    user.actorFullName
      ? {
          fullName: user.actorFullName,
          email: user.actorEmail,
          universityCard: user.actorUniversityCard ?? null,
        }
      : null;

  const accountDecidedAt =
    accountStatus === "APPROVED" || accountStatus === "REJECTED"
      ? (user.statusReviewedAt ?? null)
      : null;

  const signupApproval: SignupApprovalInfo = {
    accountCreatedAt: user.createdAt,
    accountDecidedAt,
    accountApprovedAt:
      accountStatus === "APPROVED" ? accountDecidedAt : null,
    decisionActor,
    approver: decisionActor,
  };

  let latestRequest: MyAdminRequest | null = null;

  // Admin-request row only matters for APPROVED applicants (locked UI ignores it).
  if (accountStatus === "APPROVED") {
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

    if (latest) {
      latestRequest = {
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
      };
    }
  }

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role === "ADMIN" ? "ADMIN" : "USER",
    accountStatus,
    signupApproval,
    latestRequest,
  };
}

export { getAuthorizationFailure };
