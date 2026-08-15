/**
 * Admin Book Review detail — SSR-seeds the review + FIFO-25 Activity;
 * client hook densifies after moderation/delete. Parent: CR-0003 / REQ-0034
 *
 * SSR currentAdmin supplies Approver densify attribution (card + name)
 * when client useSession is empty.
 *
 * Missing review → redirect to list (not notFound) so hard-delete remount
 * never paints black/custom 404 before client soft-nav.
 */
import { redirect } from "next/navigation";
import { requireAdminActor } from "@/lib/auth/authorization";
import { getReviewAuditEvents } from "@/lib/admin/reviewAudit";
import { getAdminReviewDetail } from "@/lib/server/reviewData";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import AdminBookReviewDetailContent from "@/components/admin/AdminBookReviewDetailContent";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireAdminActor();
  const { id } = await params;
  const [review, auditEvents, adminRow] = await Promise.all([
    getAdminReviewDetail(id),
    getReviewAuditEvents(id),
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

  if (!review) {
    redirect("/admin/book-reviews");
  }
  const currentAdmin = adminRow
    ? {
        id: adminRow.id,
        fullName: adminRow.fullName,
        email: adminRow.email,
        universityCard: adminRow.universityCard ?? null,
      }
    : null;

  const seeded: AdminBookReviewItem = {
    ...review,
    auditEvents,
  };

  return (
    <AdminBookReviewDetailContent
      initialReview={JSON.parse(JSON.stringify(seeded))}
      currentAdmin={currentAdmin}
    />
  );
};

export default Page;
