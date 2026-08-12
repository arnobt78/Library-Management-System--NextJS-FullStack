/**
 * Admin Requests Page — dedicated make-admin privilege queue.
 *
 * SSR: pending queue + recent decisions (reviewer attribution) + currentAdmin card
 * so approve/decline densify skips Robohash flash.
 * Client hydrates via React Query; admin-request.write invalidates both lists.
 */

import React from "react";
import { eq } from "drizzle-orm";
import {
  getPendingAdminRequests,
  getRecentAdminRequestDecisions,
} from "@/lib/admin/actions/admin-requests";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import AdminRequestsClient from "@/components/admin/AdminRequestsClient";

export const runtime = "nodejs";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) => {
  const params = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [pendingResult, decisionsResult, adminRow] = await Promise.all([
    getPendingAdminRequests(),
    getRecentAdminRequestDecisions(),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityCard: users.universityCard,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  if (!pendingResult.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-4">
        <div className="w-full">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
              Failed to load admin requests
            </p>
            <p className="text-xs text-gray-500 sm:text-sm">
              {pendingResult.error || "An unknown error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pendingRequests = pendingResult.data || [];
  const recentDecisions = decisionsResult.success
    ? decisionsResult.data || []
    : [];
  const currentAdmin = adminRow
    ? {
        id: adminRow.id,
        fullName: adminRow.fullName,
        email: adminRow.email,
        universityCard: adminRow.universityCard ?? null,
      }
    : null;

  return (
    <AdminRequestsClient
      initialPendingRequests={pendingRequests}
      initialRecentDecisions={recentDecisions}
      currentAdmin={currentAdmin}
      successMessage={params.success}
      errorMessage={params.error}
    />
  );
};

export default Page;
