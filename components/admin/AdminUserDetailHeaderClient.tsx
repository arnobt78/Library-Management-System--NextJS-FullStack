"use client";

/**
 * Unified User 360 header — entry-aware Back + person + badges + inline actions.
 * entry=registration → Registration Queue; privilege → Admin Requests; else All users.
 */

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import PersonAttribution from "@/components/PersonAttribution";
import AdminUserDetailActions from "@/components/admin/AdminUserDetailActions";
import type { AdminUser360Entry } from "@/components/admin/AdminUserRegistrationPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import { useAdminUserDetail } from "@/hooks/useQueries";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import type { User } from "@/lib/services/users";
import { AccountStatusBadge } from "@/lib/ui/semanticBadges";

interface AdminUserDetailHeaderClientProps {
  initialUser: User;
  currentUserId: string;
  currentAdmin: AdminRequestReviewer | null;
  entry?: AdminUser360Entry;
}

function backNav(entry: AdminUser360Entry): { href: string; label: string } {
  if (entry === "registration") {
    return { href: "/admin/account-requests", label: "Back to queue" };
  }
  if (entry === "privilege") {
    return { href: "/admin/admin-requests", label: "Back to queue" };
  }
  return { href: "/admin/users", label: "All users" };
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="gap-1.5 px-2 text-gray-600 hover:text-gray-900"
          onClick={handleBack}
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Button>
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
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
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
          <p className="text-sm text-gray-500">
            University ID {user.universityId}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{user.role ?? "USER"}</Badge>
          <AccountStatusBadge status={user.status || "PENDING"} />
        </div>
      </div>
    </div>
  );
}
