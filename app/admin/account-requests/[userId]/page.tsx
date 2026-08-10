/**
 * Admin Sign-up Request Detail (`/admin/account-requests/[userId]`).
 * SSR loads applicant + full decision timeline from user_status_decisions ledger.
 */

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdminActor } from "@/lib/auth/authorization";
import { getSignupRequestDetail } from "@/lib/admin/signupStatusDecisions";
import { parseEntityId } from "@/lib/actionInputs";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import SignupRequestDetailClient from "./SignupRequestDetailClient";

export const runtime = "nodejs";

const Page = async ({
  params,
}: {
  params: Promise<{ userId: string }>;
}) => {
  const actor = await requireAdminActor();
  const { userId: rawUserId } = await params;

  let userId: string;
  try {
    userId = parseEntityId(rawUserId);
  } catch {
    notFound();
  }

  const [detail, adminRow] = await Promise.all([
    getSignupRequestDetail(userId),
    db
      .select({ universityCard: users.universityCard })
      .from(users)
      .where(eq(users.id, actor.id))
      .limit(1),
  ]);

  if (!detail) notFound();

  const currentAdmin = {
    id: actor.id,
    fullName: actor.name,
    email: actor.email,
    universityCard: adminRow[0]?.universityCard ?? null,
  };

  return (
    <SignupRequestDetailClient
      initialDetail={JSON.parse(JSON.stringify(detail))}
      currentAdmin={currentAdmin}
    />
  );
};

export default Page;
