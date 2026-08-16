/**
 * Admin Borrow Queue detail — SSR-seeds request + auditEvents + book stats + currentAdmin.
 * Stats overlap admin/audit once bookId is known (no sequential tail).
 * Parent: Parallel SSR stats closeout
 */

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdminActorOrRedirect } from "@/lib/auth/authorization";
import { loadBorrowRequestById } from "@/lib/admin/actions/borrow";
import { getBorrowAuditEvents } from "@/lib/admin/borrowAudit";
import { loadBookBorrowStats } from "@/lib/services/loadBookBorrowStats";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import AdminBorrowRequestDetailContent from "@/components/admin/AdminBorrowRequestDetailContent";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireAdminActorOrRedirect();
  const { id } = await params;

  const resultPromise = loadBorrowRequestById(id);
  const adminPromise = db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      universityCard: users.universityCard,
    })
    .from(users)
    .where(eq(users.id, actor.id))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  const auditPromise = getBorrowAuditEvents(id);

  const result = await resultPromise;
  if (!result.success || !result.data) notFound();

  // Overlap stats with remaining admin/audit work once bookId is known.
  const [adminRow, auditEvents, initialBookStats] = await Promise.all([
    adminPromise,
    auditPromise,
    loadBookBorrowStats(result.data.bookId),
  ]);

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
      initialBookStats={JSON.parse(JSON.stringify(initialBookStats))}
      currentAdmin={currentAdmin}
    />
  );
};

export default Page;
