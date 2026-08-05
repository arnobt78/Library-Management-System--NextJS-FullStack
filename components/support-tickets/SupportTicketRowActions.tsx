/**
 * Row kebab for support tickets — View / Edit / Delete / Cancel.
 * Menu + delete alert use shared glassActionChrome (ReviewsSection parity).
 * Parent: CR-0003 / REQ-0034 — list densify UI
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useDeleteSupportTicket } from "@/hooks/useMutations";
import {
  actionAlertChrome,
  actionMenuChrome,
} from "@/lib/ui/glassActionChrome";
import SupportTicketDialog, {
  type AssignableAdminOption,
} from "@/components/support-tickets/SupportTicketDialog";

export function SupportTicketRowActions({
  ticket,
  detailHref,
  surface,
  variant = "light",
  assignableAdmins = [],
  onDeleted,
}: {
  ticket: SupportTicketListItem;
  detailHref: string;
  /** user = edit via dialog when OPEN/IN_PROGRESS; admin = adminFields dialog */
  surface: "user" | "admin";
  variant?: "light" | "dark";
  assignableAdmins?: AssignableAdminOption[];
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const deleteMutation = useDeleteSupportTicket();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const menu = actionMenuChrome(variant);
  const alert = actionAlertChrome(variant);

  const canEdit =
    surface === "admin" ||
    (surface === "user" &&
      (ticket.status === "OPEN" || ticket.status === "IN_PROGRESS"));
  const canDelete =
    surface === "admin" ||
    (surface === "user" &&
      (ticket.status === "OPEN" || ticket.status === "IN_PROGRESS"));

  const handleDelete = () => {
    deleteMutation.mutate(
      { ticketId: ticket.id },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          onDeleted?.();
        },
      },
    );
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Ticket actions"
            className={menu.trigger}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className={menu.content}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem
            className={menu.item}
            onSelect={() => router.push(detailHref)}
          >
            <Eye className="size-3.5 sm:size-4" />
            View Details
          </DropdownMenuItem>
          {canEdit ? (
            <DropdownMenuItem
              className={menu.item}
              data-no-row-click
              onSelect={() => {
                setEditOpen(true);
              }}
            >
              <Pencil className="size-3.5 sm:size-4" />
              Edit Ticket
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem
              className={menu.itemDestructive}
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-3.5 sm:size-4" />
              Delete Ticket
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator className={menu.separator} />
          <DropdownMenuItem className={menu.item}>
            <X className="size-3.5 sm:size-4" />
            Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (deleteMutation.isPending) return;
          setDeleteOpen(open);
        }}
      >
        <AlertDialogContent
          className={alert.content}
          onClick={(e) => e.stopPropagation()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={alert.title}>
              Delete ticket &ldquo;{ticket.subject}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className={`space-y-2 ${alert.description}`}>
                <p>
                  This permanently removes your ticket and all its replies. This
                  action cannot be undone.
                </p>
                <div className={alert.preview}>
                  <p className="line-clamp-2 text-sm font-medium">
                    {ticket.subject}
                  </p>
                  {ticket.description?.trim() ? (
                    <p className="mt-1.5 line-clamp-3 text-xs opacity-80">
                      {ticket.description.trim()}
                    </p>
                  ) : null}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={alert.footer}>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className={alert.cancel}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={alert.destructive}
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin sm:size-4" />
              ) : (
                <Trash2 className="size-3.5 sm:size-4" />
              )}
              {deleteMutation.isPending ? "Deleting…" : "Delete ticket"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {surface === "user" || surface === "admin" ? (
        <SupportTicketDialog
          key={`edit-${ticket.id}`}
          mode="edit"
          variant={variant}
          ticketId={ticket.id}
          initialSubject={ticket.subject}
          initialDescription={ticket.description}
          initialPriority={ticket.priority}
          initialStatus={ticket.status}
          initialAssignedToId={ticket.assignedToId}
          adminFields={surface === "admin"}
          assignableAdmins={assignableAdmins}
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </>
  );
}
