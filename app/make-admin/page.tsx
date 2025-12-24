import React from "react";
import { Button } from "@/components/ui/button";
import { createAdminRequest } from "@/lib/admin/actions/admin-requests";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <main className="root-container">
      <div className="mx-auto w-full">
        <div className="container mx-auto px-4 py-6">
          {/* Back Button */}
          <div className="mb-6">
            <Button
              asChild
              variant="ghost"
              className="text-light-100 hover:bg-gray-100/30 hover:text-light-200"
            >
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="size-4" />
                <span>Back to Home</span>
              </Link>
            </Button>
          </div>

          {/* Main Content */}
          <div className="mx-auto max-w-2xl">
            <Card className="border-2 border-gray-600 bg-gray-800/30">
              <CardHeader>
                <CardTitle className="text-center text-3xl font-bold text-light-300">
                  Request Admin Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Success Message */}
                {params.success === "request-sent" && (
                  <div className="rounded-lg border border-green-600 bg-green-900/20 p-4">
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
                        <h3 className="text-sm font-medium text-green-400">
                          ✅ Admin Request Sent Successfully!
                        </h3>
                        <div className="mt-2 text-sm text-green-300">
                          <p>
                            Your admin request has been sent to the
                            administrators for review. You will be notified once
                            it&apos;s approved or rejected.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {params.error && (
                  <div className="rounded-lg border border-red-600 bg-red-900/20 p-4">
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
                        <h3 className="text-sm font-medium text-red-400">
                          ❌ Request Failed
                        </h3>
                        <div className="mt-2 text-sm text-red-300">
                          <p>
                            {params.error === "already-admin" &&
                              "You are already an admin."}
                            {params.error === "pending-request" &&
                              "You already have a pending admin request."}
                            {params.error === "failed" &&
                              "Failed to send admin request. Please try again."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <p className="mb-4 text-light-200/80">
                    Submit a request to become an administrator. Your request
                    will be reviewed by existing administrators before approval.
                  </p>

                  <div className="mb-4 rounded-lg border border-gray-600 bg-gray-800/20 p-4">
                    <p className="text-sm text-light-100">
                      <strong className="text-light-200">Current User:</strong>{" "}
                      {session.user.email}
                    </p>
                  </div>
                </div>

                <form
                  action={async (formData) => {
                    "use server";
                    const requestReason = formData.get(
                      "requestReason"
                    ) as string;

                    if (!requestReason || requestReason.trim().length < 10) {
                      redirect("/make-admin?error=failed");
                    }

                    if (!session.user?.id) {
                      redirect("/make-admin?error=failed");
                    }

                    const result = await createAdminRequest(
                      session.user.id,
                      requestReason
                    );

                    if (result.success) {
                      redirect("/make-admin?success=request-sent");
                    } else {
                      if (result.error?.includes("already an admin")) {
                        redirect("/make-admin?error=already-admin");
                      } else if (
                        result.error?.includes("pending admin request")
                      ) {
                        redirect("/make-admin?error=pending-request");
                      } else {
                        redirect("/make-admin?error=failed");
                      }
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor="requestReason"
                      className="mb-2 block text-sm font-medium text-light-300"
                    >
                      Why do you need admin access?
                    </label>
                    <textarea
                      id="requestReason"
                      name="requestReason"
                      rows={4}
                      className="w-full rounded-md border border-gray-600 bg-gray-800/30 px-3 py-2 text-sm text-light-100 placeholder:text-light-200/50 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                      placeholder="Please explain why you need admin access and how you plan to use it responsibly..."
                      required
                      minLength={10}
                    />
                    <p className="mt-1 text-xs text-light-200/50">
                      Minimum 10 characters required
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-purple-600 text-white hover:bg-purple-700"
                  >
                    Submit Admin Request
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-light-200/70">
                    After approval, you&apos;ll be able to access:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-light-200/70">
                    <li>• Admin Dashboard</li>
                    <li>• User Management</li>
                    <li>• Book Management</li>
                    <li>• Borrow Requests</li>
                    <li>• Account Requests</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Page;
