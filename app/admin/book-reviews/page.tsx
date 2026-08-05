/**
 * Admin Book Reviews — moderation queue. SSR-seeds the full list; client
 * hook takes over for live filtering/refetch. Parent: CR-0003 / REQ-0034
 */
import { requireAdminActor } from "@/lib/auth/authorization";
import { getAdminBookReviews } from "@/lib/server/reviewData";
import BookReviewList from "@/components/admin/BookReviewList";

export const runtime = "nodejs";

const Page = async () => {
  await requireAdminActor();
  const initialReviews = await getAdminBookReviews();

  return (
    <BookReviewList
      initialReviews={JSON.parse(JSON.stringify(initialReviews))}
    />
  );
};

export default Page;
