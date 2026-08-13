/**
 * Admin Borrow Queue detail — SSR-seeds request + currentAdmin for lifecycle densify.
 */

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdminActor } from "@/lib/auth/authorization";
import { loadBorrowRequestById } from "@/lib/admin/actions/borrow";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import AdminBorrowRequestDetailContent from "@/components/admin/AdminBorrowRequestDetailContent";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireAdminActor();
  const { id } = await params;

  const [result, adminRow] = await Promise.all([
    loadBorrowRequestById(id),
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
    <AdminBorrowRequestDetailContent
      initialRequest={JSON.parse(JSON.stringify(result.data))}
      currentAdmin={currentAdmin}
    />
  );
};

export default Page;
