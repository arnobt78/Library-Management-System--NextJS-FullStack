// Parent: REQ-0025
// Server-side identity and ownership policy for every privileged mutation boundary.

import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export type ActorRole = "USER" | "ADMIN";
export type ActorStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AuthorizedActor {
  id: string;
  email: string;
  name: string;
  role: ActorRole;
  status: "APPROVED";
  /** DB university card URL — densify attribution must not invent Robohash. */
  universityCard: string | null;
}

/**
 * Signed-in identity for view-only surfaces (e.g. /make-admin locked UX).
 * Allows PENDING / REJECTED; privileged mutations still use AuthorizedActor.
 */
export interface SignedInActor {
  id: string;
  email: string;
  name: string;
  role: ActorRole;
  status: ActorStatus;
}

export type AuthorizationFailureCode = "UNAUTHENTICATED" | "FORBIDDEN";

export class AuthorizationError extends Error {
  constructor(
    readonly code: AuthorizationFailureCode,
    message: string
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

interface DatabaseActor {
  id: string;
  email: string;
  name: string;
  role: ActorRole | null;
  status: ActorStatus | null;
  universityCard: string | null;
}

async function loadDatabaseActor(
  sessionUserId: string,
): Promise<DatabaseActor | null> {
  const [databaseActor] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.fullName,
      role: users.role,
      status: users.status,
      universityCard: users.universityCard,
    })
    .from(users)
    .where(eq(users.id, sessionUserId))
    .limit(1);

  return databaseActor ?? null;
}

/**
 * Validates session identity against current database state. Keeping this policy
 * pure makes stale-role, rejected-account, and impersonation behavior testable.
 */
export function validateActor(
  sessionUserId: string | null | undefined,
  databaseActor: DatabaseActor | null,
  requiredRole?: ActorRole
): AuthorizedActor {
  if (!sessionUserId || !databaseActor || databaseActor.id !== sessionUserId) {
    throw new AuthorizationError("UNAUTHENTICATED", "Authentication required");
  }

  if (databaseActor.status !== "APPROVED") {
    throw new AuthorizationError(
      "FORBIDDEN",
      "An approved account is required"
    );
  }

  if (!databaseActor.role || (requiredRole && databaseActor.role !== requiredRole)) {
    throw new AuthorizationError("FORBIDDEN", "Admin access required");
  }

  return {
    id: databaseActor.id,
    email: databaseActor.email,
    name: databaseActor.name,
    role: databaseActor.role,
    status: "APPROVED",
    universityCard: databaseActor.universityCard ?? null,
  };
}

/**
 * Session + DB user required; account may be PENDING / APPROVED / REJECTED.
 * Used only for pages that must render a locked UX instead of bouncing.
 */
export function validateSignedInActor(
  sessionUserId: string | null | undefined,
  databaseActor: DatabaseActor | null,
): SignedInActor {
  if (!sessionUserId || !databaseActor || databaseActor.id !== sessionUserId) {
    throw new AuthorizationError("UNAUTHENTICATED", "Authentication required");
  }

  const status = databaseActor.status;
  if (
    status !== "PENDING" &&
    status !== "APPROVED" &&
    status !== "REJECTED"
  ) {
    throw new AuthorizationError("FORBIDDEN", "Invalid account status");
  }

  if (!databaseActor.role) {
    throw new AuthorizationError("FORBIDDEN", "Invalid account role");
  }

  return {
    id: databaseActor.id,
    email: databaseActor.email,
    name: databaseActor.name,
    role: databaseActor.role,
    status,
  };
}

async function requireActor(requiredRole?: ActorRole): Promise<AuthorizedActor> {
  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) {
    throw new AuthorizationError("UNAUTHENTICATED", "Authentication required");
  }

  const databaseActor = await loadDatabaseActor(sessionUserId);
  return validateActor(sessionUserId, databaseActor, requiredRole);
}

export function requireAuthenticatedActor(): Promise<AuthorizedActor> {
  return requireActor();
}

export function requireAdminActor(): Promise<AuthorizedActor> {
  return requireActor("ADMIN");
}

/**
 * Admin RSC pages — match layout: sign-in if unauthenticated, home if not admin.
 * Avoids AuthorizationError digests / Sentry noise on soft-nav / prefetch races.
 */
export async function requireAdminActorOrRedirect(): Promise<AuthorizedActor> {
  try {
    return await requireAdminActor();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.code === "UNAUTHENTICATED") redirect("/sign-in");
      redirect("/");
    }
    throw error;
  }
}

/** Authenticated user of any approval status (view-capable surfaces). */
export async function requireSignedInActor(): Promise<SignedInActor> {
  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) {
    throw new AuthorizationError("UNAUTHENTICATED", "Authentication required");
  }

  const databaseActor = await loadDatabaseActor(sessionUserId);
  return validateSignedInActor(sessionUserId, databaseActor);
}

export function assertOwnerOrAdmin(
  actor: AuthorizedActor,
  ownerId: string
): void {
  if (actor.role !== "ADMIN" && actor.id !== ownerId) {
    throw new AuthorizationError(
      "FORBIDDEN",
      "You can only modify your own records"
    );
  }
}

export function getAuthorizationFailure(error: unknown): {
  status: 401 | 403;
  message: string;
} | null {
  if (!(error instanceof AuthorizationError)) {
    return null;
  }

  return {
    status: error.code === "UNAUTHENTICATED" ? 401 : 403,
    message: error.message,
  };
}

export function getActionErrorMessage(
  error: unknown,
  fallback: string
): string {
  return error instanceof AuthorizationError ? error.message : fallback;
}
