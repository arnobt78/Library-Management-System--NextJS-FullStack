/**
 * Prefer SSR currentAdmin (DB universityCard) for densify attribution.
 * Session fallback is name/email only — JWT has no card (avoids Robohash invent).
 */

import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";

export type SessionActorUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

/** Build decisionActor for optimistic + gold densify (never invents “an admin”). */
export function resolveDecisionActor(
  currentAdmin: AdminRequestReviewer | null | undefined,
  sessionUser: SessionActorUser | null | undefined,
): AdminRequestReviewer | null {
  if (currentAdmin?.email) {
    return {
      id: currentAdmin.id ?? null,
      fullName: currentAdmin.fullName,
      email: currentAdmin.email,
      universityCard: currentAdmin.universityCard ?? null,
    };
  }
  const su = sessionUser;
  if (!su?.email || !(su.name || su.email)) return null;
  return {
    id: su.id ?? null,
    fullName: su.name?.trim() || "Admin",
    email: su.email,
    universityCard: null,
  };
}

/** Activity History / ticket-detail audit densify actor fields. */
export type ActivityActorFields = {
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorUniversityCard: string | null;
  /** Role for Activity History All Accounts / Users / Admins filter */
  actorRole?: "USER" | "ADMIN" | null;
};

/**
 * Prefer SSR decisionActor card; session name/email only when no SSR admin.
 * Never invents universityCard (Robohash until real card is known).
 */
export function resolveActivityActor(
  sessionUser: SessionActorUser | null | undefined,
  decisionActor?: AdminRequestReviewer | null,
): ActivityActorFields | Record<string, never> {
  const resolved = resolveDecisionActor(decisionActor, sessionUser);
  if (!resolved) return {};
  const role =
    sessionUser?.role === "ADMIN" || sessionUser?.role === "USER"
      ? sessionUser.role
      : null;
  return {
    actorId: resolved.id ?? null,
    actorName: resolved.fullName,
    actorEmail: resolved.email,
    actorUniversityCard: resolved.universityCard ?? null,
    actorRole: role,
  };
}
