/**
 * Admin Request Detail (`/admin/admin-requests/[id]`).
 * SSR loads make-admin request with applicant + reviewer joins.
 */

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdminActor } from "@/lib/auth/authorization";
import { getAdminRequestDetail } from "@/lib/admin/actions/admin-requests";
import { parseEntityId } from "@/lib/actionInputs";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import AdminRequestDetailClient from "./AdminRequestDetailClient";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireAdminActor();
  const { id: rawId } = await params;

  let requestId: string;
  try {
    requestId = parseEntityId(rawId);
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

  const currentAdmin = adminRow
    ? {
        id: adminRow.id,
        fullName: adminRow.fullName,
        email: adminRow.email,
        universityCard: adminRow.universityCard ?? null,
      }
    : null;

  return (
    <AdminRequestDetailClient
      initialRequest={JSON.parse(JSON.stringify(result.data))}
      currentAdmin={currentAdmin}
    />
  );
};

export default Page;
