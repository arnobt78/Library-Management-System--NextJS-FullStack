/**
 * Request Admin Access — lives under (root) for shared Header/Footer/page-shell.
 * PENDING/REJECTED accounts see a locked panel (no bounce); APPROVED get the form.
 */

import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccountRegistrationNotice from "@/components/AccountRegistrationNotice";
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import GlassSectionHeader from "@/components/GlassSectionHeader";
import MakeAdminRequestForm from "@/components/MakeAdminRequestForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthorizationFailure } from "@/lib/auth/authorization";
import type { SignupApprovalInfo } from "@/lib/admin/adminRequestTypes";
import { getMyAdminRequestPageData } from "@/lib/admin/myAdminRequest";
import { formatBorrowDateTime } from "@/lib/profile/formatBorrowDates";
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Shield,
  ShieldOff,
  UserPlus,
  Users,
} from "lucide-react";

const ACCESS_CHIPS = [
  { label: "Admin Dashboard", icon: LayoutDashboard },
  { label: "User Management", icon: Users },
  { label: "Book Management", icon: BookOpen },
  { label: "Borrow Requests", icon: Bookmark },
  { label: "Sign-up Requests", icon: UserPlus },
] as const;

function formatWhen(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return formatBorrowDateTime(value);
}

function SignupHistoryStrip({
  signupApproval,
  accountStatus,
}: {
  signupApproval: SignupApprovalInfo;
  accountStatus: "PENDING" | "APPROVED" | "REJECTED";
}) {
  const created = formatWhen(signupApproval.accountCreatedAt);
  const decided = formatWhen(
    signupApproval.accountDecidedAt ?? signupApproval.accountApprovedAt,
  );
  const actor = signupApproval.decisionActor ?? signupApproval.approver;

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-light-200 sm:text-sm">
      <p className="font-medium text-light-100">Account registration</p>
      {created ? (
        <p className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          Created on {created}
        </p>
      ) : null}
      {accountStatus === "PENDING" ? (
        <p>Status: awaiting admin approval as a library user.</p>
      ) : null}
      {accountStatus === "REJECTED" ? (
        <>
          <p>
            Status: registration was not approved. Contact a librarian if this
            is unexpected.
          </p>
          {decided ? <p>Rejected on {decided}</p> : null}
          <AdminRequestReviewerAttribution
            reviewer={actor}
            prefix="Rejected by"
            size={28}
            variant="dark"
            className="text-light-200"
            textClassName="text-xs sm:text-sm text-light-100"
          />
        </>
      ) : null}
      {accountStatus === "APPROVED" && decided ? (
        <p>Approved as library user on {decided}</p>
      ) : null}
      {accountStatus === "APPROVED" ? (
        <AdminRequestReviewerAttribution
          reviewer={actor}
          prefix="Approved by"
          size={28}
          variant="dark"
          className="text-light-200"
          textClassName="text-xs sm:text-sm text-light-100"
        />
      ) : null}
    </div>
  );
}

const Page = async () => {
  let pageData;
  try {
    pageData = await getMyAdminRequestPageData();
  } catch (error) {
    const failure = getAuthorizationFailure(error);
    if (failure?.status === 401) {
      redirect("/sign-in");
    }
    throw error;
  }

  const { email, role, accountStatus, signupApproval, latestRequest } =
    pageData;

  const accountLocked = accountStatus !== "APPROVED";

  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassSectionHeader
        as="h1"
        icon={<Shield className="size-5 text-primary sm:size-6" />}
        title="Request Admin Access"
        subtitle="Submit a request to become an administrator. Existing admins review every request before approval."
      />

      <div className="rounded-xl border border-white/10 bg-dark-300/60 p-4 text-light-100 shadow-[0_12px_28px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:p-6">
        {role === "ADMIN" && accountStatus === "APPROVED" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-light-200 sm:text-sm">
                <span className="text-light-100/80">Current user: </span>
                <span className="text-light-100">{email}</span>
              </p>
              <Badge variant="glassReturned">
                <CheckCircle2 className="size-3" />
                Admin
              </Badge>
            </div>
            <SignupHistoryStrip
              signupApproval={signupApproval}
              accountStatus={accountStatus}
            />
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
        ) : accountLocked ? (
          <div className="space-y-4">
            <AccountRegistrationNotice
              accountStatus={
                accountStatus === "REJECTED" ? "REJECTED" : "PENDING"
              }
              context="make-admin"
              email={email}
              createdAt={signupApproval.accountCreatedAt}
              decidedAt={signupApproval.accountDecidedAt}
              decisionActor={
                signupApproval.decisionActor ?? signupApproval.approver
              }
            />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-light-200 sm:text-sm">
                Why do you need admin access?
              </label>
              <textarea
                disabled
                readOnly
                rows={4}
                className="w-full resize-none rounded-md border border-white/10 bg-dark-300/50 px-2.5 py-1.5 text-xs text-light-100 opacity-60 placeholder:text-light-200/50 sm:px-3 sm:py-2 sm:text-sm"
                placeholder="Available after your account is approved…"
                value=""
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled
                  className="profile-action-btn profile-action-btn--submit opacity-50"
                >
                  <ShieldOff className="size-3.5 sm:size-4" />
                  Submit request
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 sm:pt-4">
              <p className="text-xs text-light-200/70 sm:text-sm">
                After approval, you&apos;ll be able to access:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ACCESS_CHIPS.map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-dark-300/60 px-2.5 py-1.5 text-[11px] font-medium text-light-100 opacity-70 backdrop-blur-sm sm:text-xs"
                  >
                    <Icon
                      className="size-3.5 shrink-0 text-primary sm:size-4"
                      aria-hidden
                    />
                    {label}
                  </span>
                ))}
              </div>
            </div>
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
            signupApproval={signupApproval}
          />
        )}
      </div>
    </div>
  );
};

export default Page;
