/**
 * Admin Book Review detail — SSR-seeds the review; client hook refetches
 * after moderation/delete mutations. Parent: CR-0003 / REQ-0034
 */
import { notFound } from "next/navigation";
import { requireAdminActor } from "@/lib/auth/authorization";
import { getAdminReviewDetail } from "@/lib/server/reviewData";
import AdminBookReviewDetailContent from "@/components/admin/AdminBookReviewDetailContent";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  await requireAdminActor();
  const { id } = await params;
  const review = await getAdminReviewDetail(id);

  if (!review) notFound();

  return (
    <AdminBookReviewDetailContent
      initialReview={JSON.parse(JSON.stringify(review))}
    />
  );
};

export default Page;
