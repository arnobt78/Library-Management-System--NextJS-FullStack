"use server";

/**
 * Recent library signup APPROVED/REJECTED decisions for admin Sign-up Requests UI.
 * Reads append-only user_status_decisions ledger (survives REJECTED → PENDING re-apply).
 */

import { db } from "@/database/drizzle";
import { users, userStatusDecisions } from "@/database/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAdminActor } from "@/lib/auth/authorization";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";

const RECENT_SIGNUP_DECISIONS_LIMIT = 25;

const applicantUsers = alias(users, "signup_status_decision_applicant");
const decisionActorUsers = alias(users, "signup_status_decision_actor");

export type SignupStatusDecision = {
  /** Ledger row id (stable across re-apply). */
  id: string;
  userId: string;
  fullName: string;
  email: string;
  universityId: number;
  universityCard: string | null;
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
        id: userStatusDecisions.id,
        userId: userStatusDecisions.userId,
        decision: userStatusDecisions.decision,
        decidedAt: userStatusDecisions.decidedAt,
        fullName: applicantUsers.fullName,
        email: applicantUsers.email,
        universityId: applicantUsers.universityId,
        universityCard: applicantUsers.universityCard,
        createdAt: applicantUsers.createdAt,
        actorId: decisionActorUsers.id,
        actorFullName: decisionActorUsers.fullName,
        actorEmail: decisionActorUsers.email,
        actorUniversityCard: decisionActorUsers.universityCard,
      })
      .from(userStatusDecisions)
      .innerJoin(
        applicantUsers,
        eq(userStatusDecisions.userId, applicantUsers.id),
      )
      .leftJoin(
        decisionActorUsers,
        eq(userStatusDecisions.decidedBy, decisionActorUsers.id),
      )
      .where(inArray(userStatusDecisions.decision, ["APPROVED", "REJECTED"]))
      .orderBy(desc(userStatusDecisions.decidedAt))
      .limit(safeLimit);

    const mapped = rows
      .filter(
        (
          row,
        ): row is typeof row & { decision: "APPROVED" | "REJECTED" } =>
          row.decision === "APPROVED" || row.decision === "REJECTED",
      )
      .map((row) => ({
        id: row.id,
        userId: row.userId,
        fullName: row.fullName,
        email: row.email,
        universityId: row.universityId,
        universityCard: row.universityCard ?? null,
        status: row.decision,
        createdAt: row.createdAt,
        decidedAt: row.decidedAt ?? null,
        decisionActor:
          row.actorEmail && row.actorFullName
            ? {
                id: row.actorId ?? null,
                fullName: row.actorFullName,
                email: row.actorEmail,
                universityCard: row.actorUniversityCard ?? null,
              }
            : null,
      }));


    return {
      success: true,
      data: mapped,
    };
  } catch (error) {
    console.error("Error fetching signup status decisions:", error);
    return {
      success: false,
      error: "Failed to fetch signup status decisions",
    };
  }
}
