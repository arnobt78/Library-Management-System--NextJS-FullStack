/**
 * Admin Sign-up Requests Page (`/admin/account-requests` — route kept for stability).
 *
 * SSR-fetches pending user registrations (users.status = PENDING)
 * plus recent APPROVED/REJECTED decisions with statusReviewed* attribution.
 * Not make-admin privilege requests (those live on /admin/users).
 */

import React from "react";
import { getAllUsers } from "@/lib/admin/actions/user";
import { getRecentSignupStatusDecisions } from "@/lib/admin/signupStatusDecisions";
import AccountRequestsClient from "./AccountRequestsClient";

export const runtime = "nodejs";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) => {
  const params = await searchParams;

  // Fetch pending queue + recent decisions in parallel for SSR
  const [result, decisionsResult] = await Promise.all([
    getAllUsers(),
    getRecentSignupStatusDecisions(),
  ]);

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
        <div className="w-full">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
              Failed to load sign-up requests
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
      initialRecentDecisions={decisionsResult.data ?? []}
      successMessage={params.success}
      errorMessage={params.error}
    />
  );
};

export default Page;
