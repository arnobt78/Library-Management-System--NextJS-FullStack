/**
 * Admin Requests Page — dedicated make-admin privilege queue.
 *
 * SSR: pending queue + recent decisions (reviewer attribution).
 * Client hydrates via React Query; admin-request.write invalidates both lists.
 */

import React from "react";
import {
  getPendingAdminRequests,
  getRecentAdminRequestDecisions,
} from "@/lib/admin/actions/admin-requests";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
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

  const [pendingResult, decisionsResult] = await Promise.all([
    getPendingAdminRequests(),
    getRecentAdminRequestDecisions(),
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

  return (
    <AdminRequestsClient
      initialPendingRequests={pendingRequests}
      initialRecentDecisions={recentDecisions}
      successMessage={params.success}
      errorMessage={params.error}
    />
  );
};

export default Page;
