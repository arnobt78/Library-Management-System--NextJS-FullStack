"use server";

/**
 * Slim admin privilege history loader for TanStack queryFn (User 360 densify).
 */

import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/database/drizzle";
import { adminRequests, users } from "@/database/schema";
import { requireAdminActor } from "@/lib/auth/authorization";
import { parseEntityId } from "@/lib/actionInputs";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import type { AdminPrivilegeHistoryEntry } from "@/lib/admin/adminPrivilegeHistory";

const reviewerUsers = alias(users, "privilege_history_reviewer");

export async function getAdminUserPrivilegeHistory(
  userId: string,
): Promise<AdminPrivilegeHistoryEntry[]> {
  await requireAdminActor();
  const id = parseEntityId(userId);

  const rows = await db
    .select({
      id: adminRequests.id,
      status: adminRequests.status,
      requestReason: adminRequests.requestReason,
      rejectionReason: adminRequests.rejectionReason,
      createdAt: adminRequests.createdAt,
      reviewedAt: adminRequests.reviewedAt,
      reviewedBy: adminRequests.reviewedBy,
      reviewerFullName: reviewerUsers.fullName,
      reviewerEmail: reviewerUsers.email,
      reviewerUniversityCard: reviewerUsers.universityCard,
    })
    .from(adminRequests)
    .leftJoin(reviewerUsers, eq(adminRequests.reviewedBy, reviewerUsers.id))
    .where(eq(adminRequests.userId, id))
    .orderBy(desc(adminRequests.createdAt))
    .limit(25);

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    requestReason: row.requestReason,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
    reviewer:
      row.reviewerEmail && row.reviewerFullName
        ? ({
            id: row.reviewedBy ?? null,
            fullName: row.reviewerFullName,
            email: row.reviewerEmail,
            universityCard: row.reviewerUniversityCard ?? null,
          } satisfies AdminRequestReviewer)
        : null,
  }));
}
