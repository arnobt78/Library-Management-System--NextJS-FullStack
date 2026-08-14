"use client";

/**
 * Unified User 360 header — entry-aware Back + User ID chip + person + actions.
 * Mobile: Back → actions → User ID (centered); sm+: Back | ID | actions.
 * entry=registration → Registration Queue; privilege → Admin Requests; else All Users.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, UserRound } from "lucide-react";
import PersonAttribution from "@/components/PersonAttribution";
import { AdminDetailIdChip } from "@/components/admin/AdminDetailIdChip";
import { AdminDetailToolbar } from "@/components/admin/AdminDetailToolbar";
import AdminUserDetailActions from "@/components/admin/AdminUserDetailActions";
import type { AdminUser360Entry } from "@/components/admin/AdminUserRegistrationPanel";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import { useAdminUserDetail } from "@/hooks/useQueries";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import type { User } from "@/lib/services/users";
import {
  AccountStatusBadge,
  UserRoleBadge,
} from "@/lib/ui/semanticBadges";

interface AdminUserDetailHeaderClientProps {
  initialUser: User;
  currentUserId: string;
  currentAdmin: AdminRequestReviewer | null;
  entry?: AdminUser360Entry;
}

function backNav(entry: AdminUser360Entry): { href: string; label: string } {
  if (entry === "registration") {
    return {
      href: "/admin/account-requests",
      label: "Back to Registration Queue",
    };
  }
  if (entry === "privilege") {
    return {
      href: "/admin/admin-requests",
      label: "Back to Admin Requests",
    };
  }
  return { href: "/admin/users", label: "Back to All Users" };
}

export default function AdminUserDetailHeaderClient({
  initialUser,
  currentUserId,
  currentAdmin,
  entry = "directory",
}: AdminUserDetailHeaderClientProps) {
  const [ssrUpdatedAt] = useState(() => Date.now());
  const { data: user = initialUser } = useAdminUserDetail(
    initialUser.id,
    initialUser,
    ssrUpdatedAt,
  );

  const { href: backHref, label: backLabel } = backNav(entry);
  const refreshDomain =
    entry === "privilege" ? "admin-request.write" : "user.write";
  const handleBack = useBackWithRefresh(refreshDomain, backHref);

  useEffect(() => {
    if (entry !== "privilege") return;
    const el = document.getElementById("user-360-privilege");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [entry]);

  return (
    <div className="space-y-3">
      <AdminDetailToolbar
        hasActions
        back={
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-admin"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {backLabel}
          </button>
        }
        idChip={
          <AdminDetailIdChip
            label="User ID"
            value={user.id}
            icon={UserRound}
            className="justify-center"
          />
        }
        actions={
          <AdminUserDetailActions
            user={{
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              universityCard: user.universityCard,
              universityId: user.universityId,
              role: user.role ?? "USER",
              status: user.status,
              pendingAdminRequestId: user.pendingAdminRequestId ?? null,
            }}
            currentUserId={currentUserId}
            currentAdmin={currentAdmin}
          />
        }
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PersonAttribution
            layout="stack"
            size={40}
            href={`/admin/users/${user.id}`}
            person={{
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              universityCard: user.universityCard ?? null,
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UserRoleBadge role={user.role ?? "USER"} />
          <AccountStatusBadge status={user.status || "PENDING"} />
        </div>
      </div>
    </div>
  );
}
