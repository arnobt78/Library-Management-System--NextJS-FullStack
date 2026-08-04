/**
 * Admin Users Page
 *
 * SSR: users + pending admin requests + recent decisions (reviewer attribution).
 * Client list hydrates via React Query; admin-request.write invalidates both queues.
 */

import React from "react";
import { getAllUsers } from "@/lib/admin/actions/user";
import {
  getPendingAdminRequests,
  getRecentAdminRequestDecisions,
} from "@/lib/admin/actions/admin-requests";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminUsersList from "@/components/AdminUsersList";

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

  const [usersResult, adminRequestsResult, decisionsResult] = await Promise.all(
    [getAllUsers(), getPendingAdminRequests(), getRecentAdminRequestDecisions()],
  );

  if (!usersResult.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
        <div className="w-full">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
              Failed to load users
            </p>
            <p className="text-xs text-gray-500 sm:text-sm">
              {usersResult.error || "An unknown error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const users = usersResult.data || [];
  const adminRequests = adminRequestsResult.success
    ? adminRequestsResult.data || []
    : [];
  const recentDecisions = decisionsResult.success
    ? decisionsResult.data || []
    : [];

  return (
    <AdminUsersList
      initialUsers={users}
      initialAdminRequests={adminRequests}
      initialRecentDecisions={recentDecisions}
      successMessage={params.success}
      errorMessage={params.error}
      currentUserId={session.user.id}
    />
  );
};

export default Page;
