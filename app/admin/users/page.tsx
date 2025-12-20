import React from "react";
import { Button } from "@/components/ui/button";
import { getAllUsers } from "@/lib/admin/actions/user";
import { updateUserRole, updateUserStatus } from "@/lib/admin/actions/user";
import {
  getPendingAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  removeAdminPrivileges,
} from "@/lib/admin/actions/admin-requests";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

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
    <section className="w-full rounded-2xl bg-white p-7">
      {/* Success/Error Messages */}
      {params.success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                {params.success === "role-updated" &&
                  "✅ Role Updated Successfully!"}
                {params.success === "user-approved" &&
                  "✅ User Approved Successfully!"}
                {params.success === "user-rejected" &&
                  "✅ User Rejected Successfully!"}
                {params.success === "admin-approved" &&
                  "✅ Admin Request Approved Successfully!"}
                {params.success === "admin-rejected" &&
                  "✅ Admin Request Rejected Successfully!"}
                {params.success === "admin-removed" &&
                  "✅ Admin Privileges Removed Successfully!"}
              </h3>
            </div>
          </div>
        </div>
      )}

      {params.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                ❌ Operation Failed
              </h3>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">All Users ({users.length})</h2>
      </div>

      {/* Admin Requests Section - Only shows PENDING requests */}
      {adminRequests.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-semibold">
            Pending Admin Requests ({adminRequests.length})
          </h3>
          <div className="space-y-4">
            {adminRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-yellow-200 bg-yellow-50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h4 className="font-medium text-yellow-900">
                        {request.userFullName}
                      </h4>
                      <span className="text-sm text-yellow-700">
                        ({request.userEmail})
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-yellow-800">
                      <strong>Reason:</strong> {request.requestReason}
                    </p>
                    <p className="text-xs text-yellow-600">
                      Requested on:{" "}
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <form
                      action={async () => {
                        "use server";
                        const adminId = session?.user?.id;
                        if (!adminId) {
                          redirect("/admin/users?error=unauthorized");
                        }
                        const result = await approveAdminRequest(
                          request.id,
                          adminId
                        );
                        if (result.success) {
                          redirect("/admin/users?success=admin-approved");
                        } else {
                          redirect("/admin/users?error=failed");
                        }
                      }}
                    >
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        const adminId = session?.user?.id;
                        if (!adminId) {
                          redirect("/admin/users?error=unauthorized");
                        }
                        const result = await rejectAdminRequest(
                          request.id,
                          adminId,
                          "Rejected by admin"
                        );
                        if (result.success) {
                          redirect("/admin/users?success=admin-rejected");
                        } else {
                          redirect("/admin/users?error=failed");
                        }
                      }}
                    >
                      <Button size="sm" className="bg-red-600 hover:bg-red-700">
                        Decline
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 w-full overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Name
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Email
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  University ID
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Role
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Status
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Joined
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2">
                    {user.fullName}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {user.email}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {user.universityId}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        user.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : user.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    <div className="flex gap-2">
                      {/* Show Remove Admin for existing admins (except current user) */}
                      {user.role === "ADMIN" &&
                        user.id !== session.user?.id && (
                          <form
                            action={async () => {
                              "use server";
                              const adminId = session?.user?.id;
                              if (!adminId) {
                                redirect("/admin/users?error=unauthorized");
                              }
                              const result = await removeAdminPrivileges(
                                user.id,
                                adminId
                              );
                              if (result.success) {
                                redirect("/admin/users?success=admin-removed");
                              } else {
                                redirect("/admin/users?error=failed");
                              }
                            }}
                          >
                            <Button
                              size="sm"
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              Remove Admin
                            </Button>
                          </form>
                        )}

                      {/* Show Make Admin for regular users */}
                      {user.role === "USER" && (
                        <form
                          action={async () => {
                            "use server";
                            const result = await updateUserRole(
                              user.id,
                              "ADMIN"
                            );
                            if (result.success) {
                              redirect("/admin/users?success=role-updated");
                            } else {
                              redirect("/admin/users?error=failed");
                            }
                          }}
                        >
                          <Button
                            size="sm"
                            className="bg-purple-600 text-white hover:bg-purple-700"
                          >
                            Make Admin
                          </Button>
                        </form>
                      )}

                      {/* Show Approve/Reject for pending users */}
                      {user.status === "PENDING" && (
                        <>
                          <form
                            action={async () => {
                              "use server";
                              const result = await updateUserStatus(
                                user.id,
                                "APPROVED"
                              );
                              if (result.success) {
                                redirect("/admin/users?success=user-approved");
                              } else {
                                redirect("/admin/users?error=failed");
                              }
                            }}
                          >
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                          </form>
                          <form
                            action={async () => {
                              "use server";
                              const result = await updateUserStatus(
                                user.id,
                                "REJECTED"
                              );
                              if (result.success) {
                                redirect("/admin/users?success=user-rejected");
                              } else {
                                redirect("/admin/users?error=failed");
                              }
                            }}
                          >
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Reject
                            </Button>
                          </form>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default Page;
