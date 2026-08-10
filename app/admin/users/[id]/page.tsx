/**
 * Admin User 360 (`/admin/users/[id]`) — unified detail shell (directory entry).
 * Async RSC like list pages — no Suspense full-page skeleton on soft-nav.
 * Same AdminUser360Shell as Registration Queue detail (entry=directory).
 */

import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { parseEntityId, parseProfilePagination } from "@/lib/actionInputs";
import { getAdminUserProfile } from "@/lib/admin/userProfile";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import AdminUser360Shell from "@/components/admin/AdminUser360Shell";
import type { SignupRequestDetail } from "@/lib/admin/signupStatusDecisions";
import type { User } from "@/lib/services/users";

export const runtime = "nodejs";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  let userId: string;
  let pagination: { page: number; size: number };
  try {
    if (
      Object.keys(query).some((key) => key !== "page" && key !== "size") ||
      Array.isArray(query.page) ||
      Array.isArray(query.size)
    ) {
      notFound();
    }
    userId = parseEntityId(id);
    pagination = parseProfilePagination(query.page ?? 1, query.size ?? 25);
  } catch {
    notFound();
  }

  const [data, adminRow] = await Promise.all([
    getAdminUserProfile(userId, pagination.page, pagination.size),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityCard: users.universityCard,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);
  if (!data.user) notFound();

  const currentAdmin = adminRow
    ? {
        id: adminRow.id,
        fullName: adminRow.fullName,
        email: adminRow.email,
        universityCard: adminRow.universityCard ?? null,
      }
    : null;

  const initialUser: User = {
    id: data.user.id,
    fullName: data.user.fullName,
    email: data.user.email,
    universityId: data.user.universityId,
    universityCard: data.user.universityCard ?? "",
    status: data.user.status,
    role: data.user.role,
    lastActivityDate: data.user.lastActivityDate
      ? String(data.user.lastActivityDate)
      : null,
    lastLogin: data.user.lastLogin,
    createdAt: data.user.createdAt,
    pendingAdminRequestId:
      data.requestHistory.find((r) => r.status === "PENDING")?.id ?? null,
    latestAdminRequestStatus:
      (data.requestHistory[0]?.status as
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | undefined) ?? null,
  };

  const initialSignupDetail: SignupRequestDetail = {
    id: data.user.id,
    fullName: data.user.fullName,
    email: data.user.email,
    universityId: data.user.universityId,
    universityCard: data.user.universityCard ?? null,
    status: data.user.status,
    role: data.user.role,
    createdAt: data.user.createdAt,
    decisions: data.signupDecisions,
  };

  return (
    <AdminUser360Shell
      data={JSON.parse(JSON.stringify(data))}
      initialUser={JSON.parse(JSON.stringify(initialUser))}
      initialSignupDetail={JSON.parse(JSON.stringify(initialSignupDetail))}
      currentUserId={session.user.id}
      currentAdmin={currentAdmin}
      entry="directory"
      paginationBasePath={`/admin/users/${userId}`}
    />
  );
}
