"use client";

/**
 * Personal ticket detail — dark glass:
 * Back row + Edit/Delete (justify-between); full-width title card;
 * KPI grid (status/priority/messages/assigned); Activity + Conversation.
 * Delete settle DNA matches admin: dialog stays open until densify then
 * router.replace list (no 404 remount flash). Parent: CR-0003 / REQ-0034
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Pencil,
  Ticket,
  Trash2,
} from "lucide-react";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSupportTicket } from "@/hooks/useQueries";
import { useDeleteSupportTicket } from "@/hooks/useMutations";
import GlassSectionHeader from "@/components/GlassSectionHeader";
import { GLASS_ALERT } from "@/lib/ui/glassActionChrome";
import { SKY_LINK_DARK } from "@/lib/ui/skyLinkStyles";
import { buildTicketActivityTimeline } from "@/lib/ui/ticketActivity";
import PersonAttribution from "@/components/PersonAttribution";
import UniversityIdMeta from "@/components/UniversityIdMeta";
import { Button } from "@/components/ui/button";
import { AllAdminLabel } from "@/components/support-tickets/AllAdminLabel";
import { TicketActivityTimeline } from "@/components/support-tickets/TicketActivityTimeline";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import { TicketDetailKpiGrid } from "@/components/support-tickets/TicketDetailKpiGrid";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import SupportTicketDialog from "@/components/support-tickets/SupportTicketDialog";
import SupportTicketReplyThread from "@/components/support-tickets/SupportTicketReplyThread";

/** Root glass card — pad via CARD_PAD (p-2 sm:p-4), not p-4/sm:p-6 */
const GLASS_PANEL =
  "surface-card w-full rounded-xl border border-white/10 bg-dark-300/60 shadow-[0_12px_28px_rgba(0,0,0,0.25)] backdrop-blur-sm";

export default function SupportTicketDetailContent({
  initialTicket,
  currentUserId,
}: {
  initialTicket: SupportTicketDetail;
  currentUserId: string;
}) {
  const router = useRouter();
  const handleBack = useBackWithRefresh("ticket.write", "/support-tickets");
  const [ssrTimestamp] = useState(() => Date.now());
  const { data: ticket = initialTicket } = useSupportTicket(
    initialTicket.id,
    initialTicket,
    ssrTimestamp,
  );
  const deleteMutation = useDeleteSupportTicket();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isNavigatingAfterDelete, setIsNavigatingAfterDelete] = useState(false);

  const isOwner = ticket.userId === currentUserId;
  const canEdit =
    isOwner &&
    (ticket.status === "OPEN" || ticket.status === "IN_PROGRESS");

  const activityEvents = useMemo(
    () => buildTicketActivityTimeline(ticket),
    [ticket],
  );

  const deletePending =
    deleteMutation.isPending || isNavigatingAfterDelete;

  const handleDelete = async () => {
    try {
      // Await densify; soft-nav while dialog still open (no 404 remount flash).
      await deleteMutation.mutateAsync({ ticketId: ticket.id });
      setIsNavigatingAfterDelete(true);
      router.replace("/support-tickets");
    } catch {
      setIsNavigatingAfterDelete(false);
    }
  };

  const deleteDialog = (
    <AlertDialog
      open={deleteOpen}
      onOpenChange={(next) => {
        if (deletePending && !next) return;
        setDeleteOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={deletePending}
          className="profile-action-btn profile-action-btn--cancel-request inline-flex shrink-0 items-center gap-1.5"
        >
          <Trash2 className="size-4" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className={GLASS_ALERT.content}>
        <AlertDialogHeader>
          <AlertDialogTitle className={GLASS_ALERT.title}>
            Delete ticket &ldquo;{ticket.subject}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className={`space-y-2 ${GLASS_ALERT.description}`}>
              <p>
                This permanently removes your ticket and all its replies. This
                action cannot be undone.
              </p>
              <div className={GLASS_ALERT.preview}>
                <p className="line-clamp-2 text-sm font-medium">
                  {ticket.subject}
                </p>
                <div className="mt-2">
                  <PersonAttribution
                    variant="dark"
                    person={{
                      id: ticket.userId,
                      fullName: ticket.userName,
                      email: ticket.userEmail,
                      universityCard: ticket.userUniversityCard ?? null,
                    }}
                    meta={
                      <UniversityIdMeta
                        universityId={ticket.userUniversityId}
                        variant="dark"
                      />
                    }
                  />
                </div>
                <p className="mt-1.5 line-clamp-3 text-xs opacity-80">
                  {ticket.description}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={GLASS_ALERT.footer}>
          <AlertDialogCancel
            disabled={deletePending}
            className={GLASS_ALERT.cancel}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={deletePending}
            className={GLASS_ALERT.destructive}
            onClick={() => {
              void handleDelete();
            }}
          >
            {deletePending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            {deletePending ? "Deleting…" : "Delete Ticket"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <section className="stack-section w-full space-y-4 sm:space-y-6">
      {/* Back + Edit/Delete — one responsive justify-between row */}
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-light-200/70 hover:text-light-100"
        >
          <ArrowLeft className="size-4" />
          <span className="max-w-48 truncate sm:max-w-none">
            Back to My Support Tickets
          </span>
        </button>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="profile-action-btn profile-action-btn--details inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <Pencil className="size-4" />
              Edit
            </button>
            {deleteDialog}
          </div>
        ) : null}
      </div>

      {/* Full-width title / dates glass card — sky title matches clickable names */}
      <div className={GLASS_PANEL}>
        <GlassSectionHeader
          as="h1"
          className="w-full"
          icon={<Ticket className="size-5 text-primary" />}
          title={ticket.subject}
          titleClassName={SKY_LINK_DARK}
          subtitle={
            <TicketDateMeta
              layout="inline"
              variant="dark"
              createdAt={ticket.createdAt}
              updatedAt={ticket.updatedAt}
            />
          }
        />
      </div>

      <TicketDetailKpiGrid
        variant="dark"
        status={ticket.status}
        priority={ticket.priority}
        messageCount={1 + ticket.replies.length}
        replyCount={ticket.replies.length}
        statusHint="Managed by library support"
        priorityHint="Urgency for triage"
        assignedHint="Who handles this ticket"
        assignedSlot={
          ticket.assignedToId && ticket.assignedToName ? (
            <PersonAttribution
              layout="stack"
              variant="dark"
              size={36}
              person={{
                id: ticket.assignedToId,
                fullName: ticket.assignedToName,
                email: ticket.assignedToEmail ?? "",
                universityCard: ticket.assignedToUniversityCard,
              }}
            />
          ) : (
            <AllAdminLabel variant="dark" />
          )
        }
      />

      <div className={GLASS_PANEL}>
        <p className="whitespace-pre-wrap text-sm text-light-200">
          {ticket.description}
        </p>
      </div>

      <TicketActivityTimeline events={activityEvents} variant="dark" />

      <div className={GLASS_PANEL}>
        <TicketSectionHeader
          variant="dark"
          icon={<MessageSquare className="size-5" />}
          title="Conversation"
          subtitle="Replies from you and the library support team"
        />
        <SupportTicketReplyThread
          variant="dark"
          ticketId={ticket.id}
          replies={ticket.replies}
          currentUserId={currentUserId}
          disabled={ticket.status === "CLOSED"}
        />
      </div>

      <SupportTicketDialog
        key={ticket.id}
        mode="edit"
        ticketId={ticket.id}
        initialSubject={ticket.subject}
        initialDescription={ticket.description}
        initialPriority={ticket.priority}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </section>
  );
}
