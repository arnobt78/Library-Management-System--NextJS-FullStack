/**
 * Request Admin Access — lives under (root) for shared Header/Footer/page-shell.
 * SSR loads latest admin_requests status (+ reviewer); client form owns submit/withdraw.
 */

import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import GlassSectionHeader from "@/components/GlassSectionHeader";
import MakeAdminRequestForm from "@/components/MakeAdminRequestForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyAdminRequestPageData } from "@/lib/admin/myAdminRequest";
import { CheckCircle2, LayoutDashboard, Shield } from "lucide-react";

const Page = async () => {
  let pageData;
  try {
    pageData = await getMyAdminRequestPageData();
  } catch {
    redirect("/sign-in");
  }

  const { email, role, latestRequest } = pageData;

  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassSectionHeader
        as="h1"
        icon={<Shield className="size-5 text-primary sm:size-6" />}
        title="Request Admin Access"
        subtitle="Submit a request to become an administrator. Existing admins review every request before approval."
      />

      <div className="rounded-xl border border-white/10 bg-dark-300/60 p-4 text-light-100 shadow-[0_12px_28px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:p-6">
        {role === "ADMIN" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-light-200 sm:text-sm">
                <span className="text-light-100/70">Current user: </span>
                <span className="text-light-100">{email}</span>
              </p>
              <Badge variant="glassReturned">
                <CheckCircle2 className="size-3" />
                Admin
              </Badge>
            </div>
            <p className="text-sm text-light-200">
              You already have administrator privileges. Open the admin
              dashboard to manage users, books, and borrow requests.
            </p>
            <Button asChild className="gap-1.5">
              <Link href="/admin">
                <LayoutDashboard className="size-4" />
                Open Admin Dashboard
              </Link>
            </Button>
          </div>
        ) : (
          <MakeAdminRequestForm
            userEmail={email}
            userRole={role}
            initialStatus={latestRequest?.status ?? null}
            initialRequestId={latestRequest?.id ?? null}
            initialRequestReason={latestRequest?.requestReason ?? null}
            initialRejectionReason={latestRequest?.rejectionReason ?? null}
            initialReviewer={latestRequest?.reviewer ?? null}
            initialCreatedAt={latestRequest?.createdAt ?? null}
            initialReviewedAt={latestRequest?.reviewedAt ?? null}
          />
        )}
      </div>
    </div>
  );
};

export default Page;
