/**
 * Admin Book Reviews — moderation queue. SSR-seeds the full list; client
 * hook takes over for live filtering/refetch. Parent: CR-0003 / REQ-0034
 *
 * Also SSR-loads currentAdmin (DB fullName/email/card) so Approver densify
 * does not depend on useSession (often null → "an admin" stomp).
 */
import { requireAdminActor } from "@/lib/auth/authorization";
import { getAdminBookReviews } from "@/lib/server/reviewData";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import BookReviewList from "@/components/admin/BookReviewList";

export const runtime = "nodejs";

const Page = async () => {
  const actor = await requireAdminActor();
  const [initialReviews, adminRow] = await Promise.all([
    getAdminBookReviews(),
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

  const currentAdmin = adminRow
    ? {
        id: adminRow.id,
        fullName: adminRow.fullName,
        email: adminRow.email,
        universityCard: adminRow.universityCard ?? null,
      }
    : null;

  return (
    <BookReviewList
      initialReviews={JSON.parse(JSON.stringify(initialReviews))}
      currentAdmin={currentAdmin}
    />
  );
};

export default Page;
