"use client";

/**
 * User 360 header actions — inline glass buttons (no kebab).
 * PENDING signup: Approve Student / Reject.
 * PENDING make-admin: Approve Admin / Decline.
 * APPROVED USER without pending: Make Admin.
 * ADMIN: Remove Admin.
 */

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AdminRequestDeclineDialog from "@/components/admin/AdminRequestDeclineDialog";
import { Button } from "@/components/ui/button";
import {
  useApproveUser,
  useRejectUser,
  useRemoveAdminPrivileges,
  useUpdateUserRole,
  useApproveAdminRequest,
  useRejectAdminRequest,
} from "@/hooks/useMutations";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { isProtectedDemoAccount } from "@/constants";
import { LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import {
  CheckCircle,
  Loader2,
  Lock,
  Shield,
  ShieldOff,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminUserDetailActionsUser = {
  id: string;
  fullName: string;
  email: string;
  universityCard?: string | null;
  universityId?: number | null;
  role: string;
  status: string | null;
  pendingAdminRequestId?: string | null;
};

interface AdminUserDetailActionsProps {
  user: AdminUserDetailActionsUser;
  currentUserId?: string;
  /** SSR admin actor — preferred over session for densify attribution. */
  currentAdmin?: AdminRequestReviewer | null;
}

export default function AdminUserDetailActions({
  user,
  currentUserId,
  currentAdmin = null,
}: AdminUserDetailActionsProps) {
  const { data: session } = useSession();
  const [roleTarget, setRoleTarget] = useState<{
    action: "make" | "remove";
  } | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);

  const approveUserMutation = useApproveUser();
  const rejectUserMutation = useRejectUser();
  const updateUserRoleMutation = useUpdateUserRole();
  const removeAdminPrivilegesMutation = useRemoveAdminPrivileges();
  const approveAdminRequestMutation = useApproveAdminRequest();
  const rejectAdminRequestMutation = useRejectAdminRequest();

  const sessionUserId = session?.user?.id;
  const selfId = currentUserId || sessionUserId;
  const pendingAdminId = user.pendingAdminRequestId ?? null;

  const actionsBusy =
    approveUserMutation.isPending ||
    rejectUserMutation.isPending ||
    updateUserRoleMutation.isPending ||
    removeAdminPrivilegesMutation.isPending ||
    approveAdminRequestMutation.isPending ||
    rejectAdminRequestMutation.isPending;

  if (isProtectedDemoAccount(user)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500 sm:text-sm">
        <Lock className="size-3.5 shrink-0" aria-hidden />
        Demo account
      </span>
    );
  }

  const decisionActor: AdminRequestReviewer | null = currentAdmin?.email
    ? {
        id: currentAdmin.id,
        fullName: currentAdmin.fullName,
        email: currentAdmin.email,
        universityCard: currentAdmin.universityCard,
      }
    : (() => {
        const su = session?.user as
          | { id?: string; name?: string | null; email?: string | null }
          | undefined;
        if (!su?.email || !(su.name || su.email)) return null;
        return {
          id: su.id ?? null,
          fullName: su.name?.trim() || "Admin",
          email: su.email,
          universityCard: null,
        };
      })();

  const handleApprove = () => {
    approveUserMutation.mutate({
      userId: user.id,
      userName: user.fullName,
      decisionActor,
    });
  };

  const handleReject = () => {
    rejectUserMutation.mutate({
      userId: user.id,
      userName: user.fullName,
      decisionActor,
    });
  };

  const handleApproveAdmin = () => {
    if (!pendingAdminId) return;
    approveAdminRequestMutation.mutate({
      requestId: pendingAdminId,
      userName: user.fullName,
      decisionActor,
    });
  };

  const handleConfirmDeclineAdmin = (rejectionReason: string) => {
    if (!pendingAdminId) return;
    rejectAdminRequestMutation.mutate(
      {
        requestId: pendingAdminId,
        rejectionReason,
        userName: user.fullName,
        decisionActor,
      },
      { onSuccess: () => setDeclineOpen(false) },
    );
  };

  const handleConfirmRoleChange = () => {
    if (!roleTarget) return;
    if (roleTarget.action === "make") {
      updateUserRoleMutation.mutate(
        {
          userId: user.id,
          role: "ADMIN",
          userName: user.fullName,
          userEmail: user.email,
          userUniversityCard: user.universityCard ?? null,
        },
        { onSuccess: () => setRoleTarget(null) },
      );
      return;
    }
    removeAdminPrivilegesMutation.mutate(
      {
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userUniversityCard: user.universityCard ?? null,
      },
      { onSuccess: () => setRoleTarget(null) },
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {user.status === "PENDING" ? (
          <>
            <Button
              type="button"
              className={cn(
                LIGHT_GLASS_CTA.host,
                "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
              onClick={handleApprove}
              disabled={actionsBusy}
            >
              {approveUserMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle className="size-4" />
              )}
              {approveUserMutation.isPending ? "Approving…" : "Approve Student"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-1.5"
              onClick={handleReject}
              disabled={actionsBusy}
            >
              {rejectUserMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              {rejectUserMutation.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </>
        ) : null}

        {user.status === "APPROVED" &&
        user.role === "USER" &&
        pendingAdminId ? (
          <>
            <Button
              type="button"
              className={cn(
                LIGHT_GLASS_CTA.host,
                "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
              onClick={handleApproveAdmin}
              disabled={actionsBusy}
            >
              {approveAdminRequestMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle className="size-4" />
              )}
              {approveAdminRequestMutation.isPending
                ? "Approving…"
                : "Approve Admin"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-1.5"
              onClick={() => setDeclineOpen(true)}
              disabled={actionsBusy}
            >
              <XCircle className="size-4" />
              Decline
            </Button>
          </>
        ) : null}

        {user.status === "APPROVED" &&
        user.role === "USER" &&
        !pendingAdminId ? (
          <Button
            type="button"
            className={cn(
              LIGHT_GLASS_CTA.host,
              "border-violet-600/40 bg-violet-600 text-white hover:bg-violet-700",
            )}
            onClick={() => setRoleTarget({ action: "make" })}
            disabled={actionsBusy}
          >
            <Shield className="size-4" />
            Make Admin
          </Button>
        ) : null}

        {user.role === "ADMIN" && user.id !== selfId ? (
          <Button
            type="button"
            variant="destructive"
            className="gap-1.5"
            onClick={() => setRoleTarget({ action: "remove" })}
            disabled={actionsBusy}
          >
            <ShieldOff className="size-4" />
            Remove Admin
          </Button>
        ) : null}

        {user.role === "ADMIN" && user.id === selfId ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 sm:text-sm">
            <Shield className="size-3.5" aria-hidden />
            You
          </span>
        ) : null}
      </div>

      <AlertDialog
        open={roleTarget != null}
        onOpenChange={(open) => {
          if (
            updateUserRoleMutation.isPending ||
            removeAdminPrivilegesMutation.isPending
          ) {
            return;
          }
          if (!open) setRoleTarget(null);
        }}
      >
        <AlertDialogContent className="border-gray-600 bg-gray-800/95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-light-100">
              {roleTarget?.action === "remove"
                ? "Remove admin privileges?"
                : "Promote to admin?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-light-200">
              {roleTarget?.action === "remove" ? (
                <>
                  Remove administrator access from{" "}
                  <span className="font-medium text-light-100">
                    {user.fullName}
                  </span>
                  {user.email ? ` (${user.email})` : ""}? They will become a
                  standard library user and can request admin access again
                  later.
                </>
              ) : (
                <>
                  Grant administrator privileges to{" "}
                  <span className="font-medium text-light-100">
                    {user.fullName}
                  </span>
                  {user.email ? ` (${user.email})` : ""}? They will be able to
                  manage users, books, and borrow requests.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                updateUserRoleMutation.isPending ||
                removeAdminPrivilegesMutation.isPending
              }
              className="border-gray-500 bg-gray-600 text-white hover:bg-gray-500 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRoleChange();
              }}
              disabled={
                updateUserRoleMutation.isPending ||
                removeAdminPrivilegesMutation.isPending
              }
              className={
                roleTarget?.action === "remove"
                  ? "gap-1.5 bg-red-600 text-white hover:bg-red-700"
                  : "gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
              }
            >
              {(updateUserRoleMutation.isPending ||
                removeAdminPrivilegesMutation.isPending) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {!updateUserRoleMutation.isPending &&
                !removeAdminPrivilegesMutation.isPending &&
                (roleTarget?.action === "remove" ? (
                  <ShieldOff className="size-4" />
                ) : (
                  <Shield className="size-4" />
                ))}
              {updateUserRoleMutation.isPending ||
              removeAdminPrivilegesMutation.isPending
                ? roleTarget?.action === "remove"
                  ? "Removing…"
                  : "Promoting…"
                : roleTarget?.action === "remove"
                  ? "Remove Admin"
                  : "Make Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pendingAdminId ? (
        <AdminRequestDeclineDialog
          key={pendingAdminId}
          open={declineOpen}
          applicantName={user.fullName}
          applicantEmail={user.email}
          isPending={rejectAdminRequestMutation.isPending}
          onOpenChange={(open) => {
            if (!open && !rejectAdminRequestMutation.isPending) {
              setDeclineOpen(false);
            }
          }}
          onConfirm={handleConfirmDeclineAdmin}
        />
      ) : null}
    </>
  );
}
