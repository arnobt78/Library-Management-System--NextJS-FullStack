/**
 * Prefer SSR currentAdmin (DB universityCard) for densify attribution.
 * Session fallback is name/email only — JWT has no card (avoids Robohash invent).
 */

import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";

export type SessionActorUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
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
