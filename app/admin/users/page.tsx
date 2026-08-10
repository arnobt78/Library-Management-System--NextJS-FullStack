/**
 * Admin Users directory page.
 * Make-admin queue lives at /admin/admin-requests (separate IA).
 */

import React from "react";
import { getAllUsers } from "@/lib/admin/actions/user";
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

  const usersResult = await getAllUsers();

  if (!usersResult.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-4">
        <div className="w-full">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
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

  return (
    <AdminUsersList
      initialUsers={users}
      successMessage={params.success}
      errorMessage={params.error}
      currentUserId={session.user.id}
    />
  );
};

export default Page;
