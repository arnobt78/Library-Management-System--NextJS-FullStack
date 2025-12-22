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
    return <div>Error loading account requests: {result.error}</div>;
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
