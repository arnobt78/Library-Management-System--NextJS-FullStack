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

export type SignupRequestDecisionEntry = {
  id: string;
  status: "APPROVED" | "REJECTED";
  decidedAt: Date | null;
  decisionActor: AdminRequestReviewer | null;
};

export type SignupRequestDetail = {
  id: string;
  fullName: string;
  email: string;
  universityId: number;
  universityCard: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | null;
  role: "USER" | "ADMIN" | null;
  createdAt: Date | null;
  decisions: SignupRequestDecisionEntry[];
};

export async function getSignupRequestDetail(
  userId: string,
): Promise<SignupRequestDetail | null> {
  await requireAdminActor();

  const [userRow] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      universityId: users.universityId,
      universityCard: users.universityCard,
      status: users.status,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) return null;

  const decisionRows = await db
    .select({
      id: userStatusDecisions.id,
      decision: userStatusDecisions.decision,
      decidedAt: userStatusDecisions.decidedAt,
      actorId: decisionActorUsers.id,
      actorFullName: decisionActorUsers.fullName,
      actorEmail: decisionActorUsers.email,
      actorUniversityCard: decisionActorUsers.universityCard,
    })
    .from(userStatusDecisions)
    .leftJoin(
      decisionActorUsers,
      eq(userStatusDecisions.decidedBy, decisionActorUsers.id),
    )
    .where(eq(userStatusDecisions.userId, userId))
    .orderBy(desc(userStatusDecisions.decidedAt));

  const decisions: SignupRequestDecisionEntry[] = decisionRows
    .filter(
      (
        row,
      ): row is typeof row & { decision: "APPROVED" | "REJECTED" } =>
        row.decision === "APPROVED" || row.decision === "REJECTED",
    )
    .map((row) => ({
      id: row.id,
      status: row.decision,
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
    id: userRow.id,
    fullName: userRow.fullName,
    email: userRow.email,
    universityId: userRow.universityId,
    universityCard: userRow.universityCard ?? null,
    status: userRow.status,
    role: userRow.role,
    createdAt: userRow.createdAt,
    decisions,
  };
}

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
