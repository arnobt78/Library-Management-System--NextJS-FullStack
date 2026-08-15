"use client";

/**
 * Admin Support Ticket detail — stock-inventory parity:
 * Back row + Edit/Delete; badge KPIs (no raw ENUM / no duplicate badges);
 * densified info; Notes Pencil/Trash; Activity toggle; Conversation.
 * Parent: CR-0003 / REQ-0034
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
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
import { LIGHT_ALERT, LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { FIELD_LABEL_TEXT } from "@/lib/ui/fieldLabelStyles";
import { cn } from "@/lib/utils";
import { buildTicketActivityTimeline } from "@/lib/ui/ticketActivity";
import PersonAttribution from "@/components/PersonAttribution";
import { AdminDetailIdChip } from "@/components/admin/AdminDetailIdChip";
import { AdminDetailToolbar } from "@/components/admin/AdminDetailToolbar";
import { AllAdminLabel } from "@/components/support-tickets/AllAdminLabel";
import { TicketActivityTimeline } from "@/components/support-tickets/TicketActivityTimeline";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import { TicketDetailKpiGrid } from "@/components/support-tickets/TicketDetailKpiGrid";
import { TicketInternalNotesCard } from "@/components/support-tickets/TicketInternalNotesCard";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import SupportTicketDialog, {
  type AssignableAdminOption,
} from "@/components/support-tickets/SupportTicketDialog";
import SupportTicketReplyThread from "@/components/support-tickets/SupportTicketReplyThread";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { resolveDecisionActor } from "@/lib/admin/resolveDecisionActor";

export default function AdminSupportTicketDetailContent({
  initialTicket,
  assignableAdmins,
  currentUserId,
  initialAuditEvents = [],
  currentAdmin = null,
}: {
  initialTicket: SupportTicketDetail;
  assignableAdmins: AssignableAdminOption[];
  currentUserId: string;
  initialAuditEvents?: TicketActivityEvent[];
  /** SSR DB actor — Activity densify universityCard (no Robohash bounce). */
  currentAdmin?: AdminRequestReviewer | null;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const decisionActor =
    resolveDecisionActor(currentAdmin, session?.user) ?? undefined;
  const handleBack = useBackWithRefresh(
    "ticket.write",
    "/admin/support-tickets",
  );
  // Seed auditEvents onto detail RQ so ticket.write densify can prepend
  // (SSR-only initialAuditEvents would freeze the Activity timeline).
  const seededTicket = useMemo<SupportTicketDetail>(
    () => ({
      ...initialTicket,
      auditEvents: initialTicket.auditEvents ?? initialAuditEvents,
    }),
    [initialTicket, initialAuditEvents],
  );
  const [ssrTimestamp] = useState(() => Date.now());
  const { data: ticket = seededTicket } = useSupportTicket(
    initialTicket.id,
    seededTicket,
    ssrTimestamp,
  );
  const deleteMutation = useDeleteSupportTicket();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isNavigatingAfterDelete, setIsNavigatingAfterDelete] = useState(false);

  const activityEvents = useMemo(
    () => buildTicketActivityTimeline(ticket, ticket.auditEvents ?? []),
    [ticket],
  );

  const deletePending =
    deleteMutation.isPending || isNavigatingAfterDelete;

  const handleDelete = async () => {
    try {
      // Await densify; soft-nav while dialog still open (no 404 remount flash).
      await deleteMutation.mutateAsync({
        ticketId: ticket.id,
        decisionActor,
      });
      setIsNavigatingAfterDelete(true);
      router.replace("/admin/support-tickets");
    } catch {
      setIsNavigatingAfterDelete(false);
    }
  };

  return (
    <section className="w-full space-y-4 sm:space-y-6">
      {/* Mobile: Back → actions → ID (centered); sm+: Back | ID | actions */}
      <AdminDetailToolbar
        hasActions
        back={
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-admin"
          >
            <ArrowLeft className="size-4" />
            <span className="max-w-44 truncate sm:max-w-none">
              Back to Support Tickets
            </span>
          </button>
        }
        idChip={
          <AdminDetailIdChip
            label="Ticket ID"
            value={ticket.id}
            icon={Ticket}
            className="justify-center"
          />
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className={cn(
                LIGHT_GLASS_CTA.host,
                LIGHT_GLASS_CTA.edit,
                "bg-primary-admin text-white",
              )}
            >
              <Pencil className="size-4" />
              <span className="hidden sm:inline">Edit Ticket</span>
              <span className="sm:hidden">Edit</span>
            </button>
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
                  className={cn(
                    LIGHT_GLASS_CTA.host,
                    LIGHT_GLASS_CTA.delete,
                    "bg-red-800 text-white",
                  )}
                >
                  <Trash2 className="size-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className={LIGHT_ALERT.content}>
                <AlertDialogHeader>
                  <AlertDialogTitle className={LIGHT_ALERT.title}>
                    Delete ticket &ldquo;{ticket.subject}&rdquo;?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className={`space-y-2 ${LIGHT_ALERT.description}`}>
                      <p>
                        This permanently removes the ticket and all its replies.
                        This action cannot be undone.
                      </p>
                      <div className={LIGHT_ALERT.preview}>
                        <p className="line-clamp-2 text-sm font-medium">
                          {ticket.subject}
                        </p>
                        <p className="mt-1.5 line-clamp-3 text-xs opacity-80">
                          {ticket.description}
                        </p>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className={LIGHT_ALERT.footer}>
                  <AlertDialogCancel
                    disabled={deletePending}
                    className={LIGHT_ALERT.cancel}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDelete();
                    }}
                    disabled={deletePending}
                    className={LIGHT_ALERT.destructive}
                  >
                    {deletePending ? (
                      <Loader2 className="size-3.5 animate-spin sm:size-4" />
                    ) : (
                      <Trash2 className="size-3.5 sm:size-4" />
                    )}
                    {deletePending ? "Deleting…" : "Delete ticket"}
                  </button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      <div className="admin-panel w-full space-y-2">
        <h1 className="text-lg font-medium text-sky-700 sm:text-xl">
          {ticket.subject}
        </h1>
        <TicketDateMeta
          layout="inline"
          variant="light"
          createdAt={ticket.createdAt}
          updatedAt={ticket.updatedAt}
        />
      </div>

      <TicketDetailKpiGrid
        variant="light"
        status={ticket.status}
        priority={ticket.priority}
        messageCount={1 + ticket.replies.length}
        replyCount={ticket.replies.length}
        statusHint="Change via Edit Ticket"
        priorityHint="Urgency for triage"
        assignedHint="Queue owner for this case"
        messageBreakdown={(() => {
          const staff = ticket.replies.filter(
            (r) => r.userRole === "ADMIN",
          ).length;
          const requester = ticket.replies.length - staff;
          return `Description · ${requester} requester · ${staff} staff`;
        })()}
        assignedSlot={
          ticket.assignedToId && ticket.assignedToName ? (
            <PersonAttribution
              layout="stack"
              size={36}
              href={`/admin/users/${ticket.assignedToId}`}
              person={{
                id: ticket.assignedToId,
                fullName: ticket.assignedToName,
                email: ticket.assignedToEmail ?? "",
                universityCard: ticket.assignedToUniversityCard,
              }}
            />
          ) : (
            <AllAdminLabel />
          )
        }
      />

      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="admin-panel space-y-4">
          <TicketSectionHeader
            variant="light"
            icon={<Users className="size-5" />}
            title="Ticket Parties"
            subtitle="Requester and assignee"
            className="mb-0"
          />
          <div className="space-y-1">
            <p className={FIELD_LABEL_TEXT}>Requester</p>
            <PersonAttribution
              layout="stack"
              size={36}
              href={`/admin/users/${ticket.userId}`}
              person={{
                id: ticket.userId,
                fullName: ticket.userName,
                email: ticket.userEmail,
                universityCard: ticket.userUniversityCard,
              }}
              meta={
                <TicketDateMeta
                  createdAt={ticket.createdAt}
                  createdLabel="Created"
                  hideUpdated
                />
              }
            />
          </div>
          <div className="space-y-1">
            <p className={FIELD_LABEL_TEXT}>Assigned To</p>
            {ticket.assignedToId && ticket.assignedToName ? (
              <PersonAttribution
                layout="stack"
                size={36}
                href={`/admin/users/${ticket.assignedToId}`}
                person={{
                  id: ticket.assignedToId,
                  fullName: ticket.assignedToName,
                  email: ticket.assignedToEmail ?? "",
                  universityCard: ticket.assignedToUniversityCard,
                }}
                meta={
                  <TicketDateMeta
                    updatedAt={ticket.updatedAt}
                    updatedLabel="Updated"
                    hideCreated
                  />
                }
              />
            ) : (
              <div className="flex min-w-0 flex-col gap-1 leading-none">
                <AllAdminLabel />
                <TicketDateMeta
                  updatedAt={ticket.updatedAt}
                  updatedLabel="Updated"
                  hideCreated
                />
              </div>
            )}
          </div>
          {ticket.relatedBookTitle ? (
            <div className="inline-flex items-center gap-1.5 text-sm text-gray-600">
              <BookOpen className="size-3.5" aria-hidden />
              {ticket.relatedBookTitle}
            </div>
          ) : null}
        </div>
        <div className="admin-panel space-y-2">
          <TicketSectionHeader
            variant="light"
            icon={<FileText className="size-5" />}
            title="Ticket Description"
            subtitle="Full message from the requester"
            className="mb-0"
          />
          {/* Plain body copy on white — no nested border/bg card */}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-700">
            {ticket.description}
          </p>
        </div>
      </div>

      <TicketInternalNotesCard
        ticketId={ticket.id}
        notes={ticket.notes}
        decisionActor={decisionActor}
      />

      <TicketActivityTimeline
        events={activityEvents}
        variant="light"
        adminUserHref
      />

      <div className="admin-panel w-full">
        <TicketSectionHeader
          variant="light"
          icon={<MessageSquare className="size-5" />}
          title="Conversation"
          subtitle="Reply thread with the ticket requester"
        />
        <SupportTicketReplyThread
          ticketId={ticket.id}
          replies={ticket.replies}
          currentUserId={currentUserId}
          disabled={ticket.status === "CLOSED"}
          decisionActor={decisionActor}
        />
      </div>

      <SupportTicketDialog
        mode="edit"
        variant="light"
        adminFields
        ticketId={ticket.id}
        initialSubject={ticket.subject}
        initialDescription={ticket.description}
        initialPriority={ticket.priority}
        initialStatus={ticket.status}
        initialAssignedToId={ticket.assignedToId}
        assignableAdmins={assignableAdmins}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        decisionActor={decisionActor}
      />
    </section>
  );
}
