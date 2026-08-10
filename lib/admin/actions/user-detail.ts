"use server";

/**
 * Slim admin user row for TanStack users.detail densify / PrefetchLink.
 * Full User 360 history stays on getAdminUserProfile (RSC).
 */

import { eq } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { requireAdminActor } from "@/lib/auth/authorization";
import { parseEntityId } from "@/lib/actionInputs";
import type { User } from "@/lib/services/users";

export async function getAdminUserDetailCache(
  userId: string,
): Promise<User | null> {
  await requireAdminActor();
  const id = parseEntityId(userId);

  const [row] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      universityId: users.universityId,
      universityCard: users.universityCard,
      status: users.status,
      role: users.role,
      lastActivityDate: users.lastActivityDate,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    universityId: row.universityId,
    universityCard: row.universityCard ?? "",
    status: row.status,
    role: row.role,
    lastActivityDate: row.lastActivityDate
      ? String(row.lastActivityDate)
      : null,
    lastLogin: row.lastLogin,
    createdAt: row.createdAt,
  };
}
