/**
 * Admin Book Requests Page — SSR seeds queue + currentAdmin for lifecycle densify.
 */

import React from "react";
import { eq } from "drizzle-orm";
import { requireAdminActor } from "@/lib/auth/authorization";
import { getAllBorrowRequests } from "@/lib/admin/actions/borrow";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import AdminBookRequestsList from "@/components/AdminBookRequestsList";

export const runtime = "nodejs";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) => {
  const params = await searchParams;
  const actor = await requireAdminActor();

  const [result, adminRow] = await Promise.all([
    getAllBorrowRequests(),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityCard: users.universityCard,
      })
      .from(users)
      .where(eq(users.id, actor.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-4">
        <div className="w-full">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
              Failed to load borrow requests
            </p>
            <p className="text-xs text-gray-500 sm:text-sm">
              {result.error || "An unknown error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentAdmin = adminRow
    ? {
        id: adminRow.id,
        fullName: adminRow.fullName,
        email: adminRow.email,
        universityCard: adminRow.universityCard ?? null,
      }
    : null;

  // Serialize Dates for Client Component props (RQ seed).
  const requests = JSON.parse(JSON.stringify(result.data || []));

  return (
    <AdminBookRequestsList
      initialRequests={requests}
      currentAdmin={currentAdmin}
      successMessage={params.success}
      errorMessage={params.error}
    />
  );
};

export default Page;
