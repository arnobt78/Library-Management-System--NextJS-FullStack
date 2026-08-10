"use client";

/**
 * User 360 header kebab — signup approve/reject, make/remove admin.
 * Make-admin queue detail lives at /admin/admin-requests (separate IA).
 */

import { useState } from "react";
import { useSession } from "next-auth/react";
import PrefetchLink from "@/components/PrefetchLink";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useApproveUser,
  useRejectUser,
  useRemoveAdminPrivileges,
  useUpdateUserRole,
} from "@/hooks/useMutations";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { isProtectedDemoAccount } from "@/constants";
import { LIGHT_MENU } from "@/lib/ui/glassActionChrome";
import {
  CheckCircle,
  ClipboardList,
  Loader2,
  Lock,
  MoreVertical,
  Shield,
  ShieldOff,
  X,
  XCircle,
} from "lucide-react";

export type AdminUserDetailActionsUser = {
  id: string;
  fullName: string;
  email: string;
  universityCard?: string | null;
  universityId?: number | null;
  role: string;
  status: string | null;
};

interface AdminUserDetailActionsProps {
  user: AdminUserDetailActionsUser;
  currentUserId?: string;
  /** SSR admin actor — preferred over session for densify attribution (card + name). */
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

  const approveUserMutation = useApproveUser();
  const rejectUserMutation = useRejectUser();
  const updateUserRoleMutation = useUpdateUserRole();
  const removeAdminPrivilegesMutation = useRemoveAdminPrivileges();

  const sessionUserId = session?.user?.id;
  const selfId = currentUserId || sessionUserId;

  const actionsBusy =
    approveUserMutation.isPending ||
    rejectUserMutation.isPending ||
    updateUserRoleMutation.isPending ||
    removeAdminPrivilegesMutation.isPending;

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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="User actions"
            className={LIGHT_MENU.trigger}
            disabled={actionsBusy}
          >
            <MoreVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={LIGHT_MENU.content}>
          {user.status === "PENDING" && (
            <>
              <DropdownMenuItem asChild className={LIGHT_MENU.item}>
                <PrefetchLink
                  href={`/admin/account-requests/${user.id}`}
                  prefetch={false}
                >
                  <ClipboardList className="size-3.5" />
                  View registration queue detail
                </PrefetchLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator className={LIGHT_MENU.separator} />
              <DropdownMenuItem
                className={`${LIGHT_MENU.item} text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700`}
                onSelect={handleApprove}
                disabled={actionsBusy}
              >
                <CheckCircle className="size-3.5" />
                Approve Student
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`${LIGHT_MENU.item} text-red-700 focus:bg-red-50 focus:text-red-700 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700`}
                onSelect={handleReject}
                disabled={actionsBusy}
              >
                <XCircle className="size-3.5" />
                Reject
              </DropdownMenuItem>
              <DropdownMenuSeparator className={LIGHT_MENU.separator} />
            </>
          )}
          {user.status === "APPROVED" && user.role === "USER" && (
            <DropdownMenuItem
              className={`${LIGHT_MENU.item} text-violet-700 focus:bg-violet-50 focus:text-violet-700 data-[highlighted]:bg-violet-50 data-[highlighted]:text-violet-700`}
              onSelect={() => setRoleTarget({ action: "make" })}
              disabled={actionsBusy}
            >
              <Shield className="size-3.5" />
              Make Admin
            </DropdownMenuItem>
          )}
          {user.role === "ADMIN" && user.id !== selfId && (
            <DropdownMenuItem
              className={LIGHT_MENU.itemDestructive}
              onSelect={() => setRoleTarget({ action: "remove" })}
              disabled={actionsBusy}
            >
              <ShieldOff className="size-3.5" />
              Remove Admin
            </DropdownMenuItem>
          )}
          {user.role === "ADMIN" && user.id === selfId && (
            <DropdownMenuItem className={LIGHT_MENU.item} disabled>
              <Shield className="size-3.5" />
              You
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className={LIGHT_MENU.separator} />
          <DropdownMenuItem className={LIGHT_MENU.item}>
            <X className="size-3.5" />
            Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  );
}
