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
  Trash2,
  Users,
} from "lucide-react";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import {
  AlertDialog,
  AlertDialogAction,
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
import { cn } from "@/lib/utils";
import { buildTicketActivityTimeline } from "@/lib/ui/ticketActivity";
import PersonAttribution from "@/components/PersonAttribution";
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

export default function AdminSupportTicketDetailContent({
  initialTicket,
  assignableAdmins,
  currentUserId,
  initialAuditEvents = [],
}: {
  initialTicket: SupportTicketDetail;
  assignableAdmins: AssignableAdminOption[];
  currentUserId: string;
  initialAuditEvents?: TicketActivityEvent[];
}) {
  const router = useRouter();
  const handleBack = useBackWithRefresh(
    "ticket.write",
    "/admin/support-tickets",
  );
  const { data: ticket = initialTicket } = useSupportTicket(
    initialTicket.id,
    initialTicket,
  );
  const deleteMutation = useDeleteSupportTicket();
  const [editOpen, setEditOpen] = useState(false);

  const activityEvents = useMemo(
    () => buildTicketActivityTimeline(ticket, initialAuditEvents),
    [ticket, initialAuditEvents],
  );

  const handleDelete = () => {
    deleteMutation.mutate(
      { ticketId: ticket.id },
      { onSuccess: () => router.push("/admin/support-tickets") },
    );
  };

  return (
    <section className="w-full space-y-4 sm:space-y-6">
      {/* Back + actions — justify-between, wraps on narrow screens */}
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
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
        {/* Light CTAs — primary-admin / red-800 (must stay in Tailwind content + theme) */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className={cn(
              LIGHT_GLASS_CTA.host,
              LIGHT_GLASS_CTA.edit,
              // Explicit safeties so JIT always sees these class strings here too
              "bg-primary-admin text-white",
            )}
          >
            <Pencil className="size-4" />
            <span className="hidden sm:inline">Edit Ticket</span>
            <span className="sm:hidden">Edit</span>
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                disabled={deleteMutation.isPending}
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
                  disabled={deleteMutation.isPending}
                  className={LIGHT_ALERT.cancel}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className={LIGHT_ALERT.destructive}
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
        </div>
      </div>

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
            title="Ticket parties"
            subtitle="Requester, assignee, and timeline"
            className="mb-0"
          />
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Requester
            </p>
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
            />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Assigned To
            </p>
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
              />
            ) : (
              <AllAdminLabel />
            )}
          </div>
          <TicketDateMeta
            layout="stack"
            variant="light"
            createdAt={ticket.createdAt}
            updatedAt={ticket.updatedAt}
          />
          {ticket.relatedBookTitle ? (
            <div className="inline-flex items-center gap-1.5 text-sm text-gray-600">
              <BookOpen className="size-3.5" aria-hidden />
              {ticket.relatedBookTitle}
            </div>
          ) : null}
        </div>
        <div className="admin-panel space-y-3">
          <TicketSectionHeader
            variant="light"
            icon={<FileText className="size-5" />}
            title="Description"
            subtitle="Full message from the requester"
            className="mb-0"
          />
          {/* Plain body copy on white — no nested border/bg card */}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-700">
            {ticket.description}
          </p>
        </div>
      </div>

      <TicketInternalNotesCard ticketId={ticket.id} notes={ticket.notes} />

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
      />
    </section>
  );
}
