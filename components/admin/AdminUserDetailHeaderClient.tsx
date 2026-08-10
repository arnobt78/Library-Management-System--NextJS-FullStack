"use client";

/**
 * User 360 header — PersonAttribution + role/status badges + actions.
 * Binds to users.detail RQ so densifyUserWrite paints status/role instantly.
 */

import { useState } from "react";
import PrefetchLink from "@/components/PrefetchLink";
import PersonAttribution from "@/components/PersonAttribution";
import AdminUserDetailActions from "@/components/admin/AdminUserDetailActions";
import { Badge } from "@/components/ui/badge";
import { useAdminUserDetail } from "@/hooks/useQueries";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import type { User } from "@/lib/services/users";
import { AccountStatusBadge } from "@/lib/ui/semanticBadges";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { cn } from "@/lib/utils";

interface AdminUserDetailHeaderClientProps {
  initialUser: User;
  currentUserId: string;
  currentAdmin: AdminRequestReviewer | null;
}

export default function AdminUserDetailHeaderClient({
  initialUser,
  currentUserId,
  currentAdmin,
}: AdminUserDetailHeaderClientProps) {
  const [ssrUpdatedAt] = useState(() => Date.now());
  const { data: user = initialUser } = useAdminUserDetail(
    initialUser.id,
    initialUser,
    ssrUpdatedAt,
  );

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-2">
        <PrefetchLink
          href="/admin/users"
          prefetch={false}
          className={cn("text-sm", SKY_LINK_LIGHT)}
        >
          ← All users
        </PrefetchLink>
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
        <AdminUserDetailActions
          user={{
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            universityCard: user.universityCard,
            universityId: user.universityId,
            role: user.role ?? "USER",
            status: user.status,
          }}
          currentUserId={currentUserId}
          currentAdmin={currentAdmin}
        />
      </div>
    </div>
  );
}
