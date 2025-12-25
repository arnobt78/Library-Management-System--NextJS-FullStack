/**
 * Admin Account Requests Page
 *
 * Server Component that fetches pending user account requests server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 */

import React from "react";
import { getAllUsers } from "@/lib/admin/actions/user";
import AccountRequestsClient from "./AccountRequestsClient";

export const runtime = "nodejs";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) => {
  const params = await searchParams;

  // Fetch all users server-side for SSR, then filter for PENDING
  const result = await getAllUsers();

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
              Failed to load account requests
            </p>
            <p className="text-xs text-gray-500 sm:text-sm">
              {result.error || "An unknown error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const users = result.data || [];
  const pendingUsers = users.filter((user) => user.status === "PENDING");

  return (
    <AccountRequestsClient
      initialUsers={pendingUsers}
      successMessage={params.success}
      errorMessage={params.error}
    />
  );
};

export default Page;
