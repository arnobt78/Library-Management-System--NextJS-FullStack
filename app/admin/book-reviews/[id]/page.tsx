/**
 * Admin Book Review detail — SSR-seeds the review; client hook refetches
 * after moderation/delete mutations. Parent: CR-0003 / REQ-0034
 *
 * SSR currentAdmin supplies Approver densify attribution (card + name)
 * when client useSession is empty.
 */
import { notFound } from "next/navigation";
import { requireAdminActor } from "@/lib/auth/authorization";
import { getAdminReviewDetail } from "@/lib/server/reviewData";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import AdminBookReviewDetailContent from "@/components/admin/AdminBookReviewDetailContent";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireAdminActor();
  const { id } = await params;
  const [review, adminRow] = await Promise.all([
    getAdminReviewDetail(id),
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

  if (!review) notFound();

  const currentAdmin = adminRow
    ? {
        id: adminRow.id,
        fullName: adminRow.fullName,
        email: adminRow.email,
        universityCard: adminRow.universityCard ?? null,
      }
    : null;

  return (
    <AdminBookReviewDetailContent
      initialReview={JSON.parse(JSON.stringify(review))}
      currentAdmin={currentAdmin}
    />
  );
};

export default Page;
