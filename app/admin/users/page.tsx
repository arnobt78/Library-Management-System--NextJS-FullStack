/**
 * Admin Users directory page.
 * Make-admin queue lives at /admin/admin-requests (separate IA).
 * SSR currentAdmin (DB card) so list densify skips Robohash flash.
 */

import React from "react";
import { eq } from "drizzle-orm";
import { getAllUsers } from "@/lib/admin/actions/user";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
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

  const [usersResult, adminRow] = await Promise.all([
    getAllUsers(),
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

  const usersList = usersResult.data || [];
  const currentAdmin = adminRow
    ? {
        id: adminRow.id,
        fullName: adminRow.fullName,
        email: adminRow.email,
        universityCard: adminRow.universityCard ?? null,
      }
    : null;

  return (
    <AdminUsersList
      initialUsers={usersList}
      successMessage={params.success}
      errorMessage={params.error}
      currentUserId={session.user.id}
      currentAdmin={currentAdmin}
    />
  );
};

export default Page;
