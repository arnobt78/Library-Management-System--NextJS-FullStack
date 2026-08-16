/**
 * Admin Request privilege entry into unified User 360 (`/admin/admin-requests/[id]`).
 * Resolves request → userId; same AdminUser360Shell as directory/registration
 * with entry=privilege (Back → Admin Requests; focus #user-360-privilege).
 */

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdminActorOrRedirect } from "@/lib/auth/authorization";
import { getAdminRequestDetail } from "@/lib/admin/actions/admin-requests";
import { getAdminUserProfile } from "@/lib/admin/userProfile";
import { parseEntityId, parseProfilePagination } from "@/lib/actionInputs";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import AdminUser360Shell from "@/components/admin/AdminUser360Shell";
import type { SignupRequestDetail } from "@/lib/admin/signupStatusDecisions";
import type { User } from "@/lib/services/users";

export const runtime = "nodejs";

export default async function AdminRequestPrivilegePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdminActorOrRedirect();
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);

  let requestId: string;
  let pagination: { page: number; size: number };
  try {
    if (
      Object.keys(query).some((key) => key !== "page" && key !== "size") ||
      Array.isArray(query.page) ||
      Array.isArray(query.size)
    ) {
      notFound();
    }
    requestId = parseEntityId(rawId);
    pagination = parseProfilePagination(query.page ?? 1, query.size ?? 25);
  } catch {
    notFound();
  }

  const [result, adminRow] = await Promise.all([
    getAdminRequestDetail(requestId),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityCard: users.universityCard,
      })
      .from(users)
      .where(eq(users.id, actor.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  if (!result.success || !result.data) notFound();

  const userId = result.data.userId;
  const data = await getAdminUserProfile(
    userId,
    pagination.page,
    pagination.size,
  );
  if (!data.user) notFound();

  const currentAdmin = adminRow
    ? {
        id: adminRow.id,
        fullName: adminRow.fullName,
        email: adminRow.email,
        universityCard: adminRow.universityCard ?? null,
      }
    : {
        id: actor.id,
        fullName: actor.name,
        email: actor.email,
        universityCard: null,
      };

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
      currentUserId={actor.id}
      currentAdmin={currentAdmin}
      entry="privilege"
      paginationBasePath={`/admin/admin-requests/${requestId}`}
    />
  );
}
