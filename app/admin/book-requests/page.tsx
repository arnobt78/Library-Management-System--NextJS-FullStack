/**
 * Admin Book Requests Page
 *
 * Server Component that fetches borrow requests server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 */

import React from "react";
import { getAllBorrowRequests } from "@/lib/admin/actions/borrow";
import AdminBookRequestsList from "@/components/AdminBookRequestsList";

export const runtime = "nodejs";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) => {
  const params = await searchParams;

  // Fetch all data server-side for SSR
  const result = await getAllBorrowRequests();

  if (!result.success) {
    return <div>Error loading borrow requests: {result.error}</div>;
  }

  const requests = result.data || [];

  return (
    <AdminBookRequestsList
      initialRequests={requests}
      successMessage={params.success}
      errorMessage={params.error}
    />
  );
};

export default Page;
