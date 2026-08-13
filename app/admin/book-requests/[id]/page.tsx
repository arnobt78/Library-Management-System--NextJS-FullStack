/**
 * Admin Borrow Queue detail — SSR-seeds request + auditEvents + currentAdmin.
 * Parent: borrow detail gaps + record/history DNA
 */

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdminActor } from "@/lib/auth/authorization";
import { loadBorrowRequestById } from "@/lib/admin/actions/borrow";
import { getBorrowAuditEvents } from "@/lib/admin/borrowAudit";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import AdminBorrowRequestDetailContent from "@/components/admin/AdminBorrowRequestDetailContent";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireAdminActor();
  const { id } = await params;

  const [result, adminRow, auditEvents] = await Promise.all([
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
    getBorrowAuditEvents(id),
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

  const initialRequest = {
    ...result.data,
    auditEvents,
  };

  return (
    <AdminBorrowRequestDetailContent
      initialRequest={JSON.parse(JSON.stringify(initialRequest))}
      currentAdmin={currentAdmin}
    />
  );
};

export default Page;
