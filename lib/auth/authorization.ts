// Parent: REQ-0025
// Server-side identity and ownership policy for every privileged mutation boundary.

import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

export type ActorRole = "USER" | "ADMIN";
export type ActorStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AuthorizedActor {
  id: string;
  email: string;
  name: string;
  role: ActorRole;
  status: "APPROVED";
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
  };
}

async function requireActor(requiredRole?: ActorRole): Promise<AuthorizedActor> {
  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) {
    throw new AuthorizationError("UNAUTHENTICATED", "Authentication required");
  }

  const [databaseActor] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.fullName,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, sessionUserId))
    .limit(1);

  return validateActor(sessionUserId, databaseActor ?? null, requiredRole);
}

export function requireAuthenticatedActor(): Promise<AuthorizedActor> {
  return requireActor();
}

export function requireAdminActor(): Promise<AuthorizedActor> {
  return requireActor("ADMIN");
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
