/**
 * Recent library signup APPROVED/REJECTED decisions for admin Sign-up Requests UI.
 * Parallel to getRecentAdminRequestDecisions (make-admin history on All Users).
 */

import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAdminActor } from "@/lib/auth/authorization";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";

const RECENT_SIGNUP_DECISIONS_LIMIT = 25;

const decisionActorUsers = alias(users, "signup_status_decision_actor");

export type SignupStatusDecision = {
  id: string;
  fullName: string;
  email: string;
  universityId: number;
  status: "APPROVED" | "REJECTED";
  createdAt: Date | null;
  decidedAt: Date | null;
  decisionActor: AdminRequestReviewer | null;
};

export async function getRecentSignupStatusDecisions(
  limit: number = RECENT_SIGNUP_DECISIONS_LIMIT,
): Promise<{
  success: boolean;
  error?: string;
  data?: SignupStatusDecision[];
}> {
  try {
    await requireAdminActor();
    const safeLimit = Math.min(
      Math.max(1, Math.floor(limit)),
      RECENT_SIGNUP_DECISIONS_LIMIT,
    );

    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityId: users.universityId,
        status: users.status,
        createdAt: users.createdAt,
        decidedAt: users.statusReviewedAt,
        actorFullName: decisionActorUsers.fullName,
        actorEmail: decisionActorUsers.email,
        actorUniversityCard: decisionActorUsers.universityCard,
      })
      .from(users)
      .leftJoin(
        decisionActorUsers,
        eq(users.statusReviewedBy, decisionActorUsers.id),
      )
      .where(inArray(users.status, ["APPROVED", "REJECTED"]))
      .orderBy(desc(users.statusReviewedAt))
      .limit(safeLimit);

    return {
      success: true,
      data: rows
        .filter(
          (row): row is typeof row & { status: "APPROVED" | "REJECTED" } =>
            row.status === "APPROVED" || row.status === "REJECTED",
        )
        .map((row) => ({
          id: row.id,
          fullName: row.fullName,
          email: row.email,
          universityId: row.universityId,
          status: row.status,
          createdAt: row.createdAt,
          decidedAt: row.decidedAt ?? null,
          decisionActor:
            row.actorEmail && row.actorFullName
              ? {
                  fullName: row.actorFullName,
                  email: row.actorEmail,
                  universityCard: row.actorUniversityCard ?? null,
                }
              : null,
        })),
    };
  } catch (error) {
    console.error("Error fetching signup status decisions:", error);
    return {
      success: false,
      error: "Failed to fetch signup status decisions",
    };
  }
}
