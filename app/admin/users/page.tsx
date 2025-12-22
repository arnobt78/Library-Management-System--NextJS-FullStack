/**
 * Admin Users Page
 *
 * Server Component that fetches users and admin requests server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 */

import React from "react";
import { getAllUsers } from "@/lib/admin/actions/user";
import { getPendingAdminRequests } from "@/lib/admin/actions/admin-requests";
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

  // Fetch all data server-side for SSR
  const [usersResult, adminRequestsResult] = await Promise.all([
    getAllUsers(),
    getPendingAdminRequests(),
  ]);

  if (!usersResult.success) {
    return <div>Error loading users: {usersResult.error}</div>;
  }

  const users = usersResult.data || [];
  const adminRequests = adminRequestsResult.success
    ? adminRequestsResult.data || []
    : [];

  return (
    <AdminUsersList
      initialUsers={users}
      initialAdminRequests={adminRequests}
      successMessage={params.success}
      errorMessage={params.error}
      currentUserId={session.user.id}
    />
  );
};

export default Page;
