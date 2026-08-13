/**
 * Admin Internal Notes — view mode + Pencil/Trash header icons (stock-inventory parity).
 * No always-on textarea; edit opens inline draft with Cancel/Save.
 * Parent: CR-0003 / REQ-0034
 */
"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, StickyNote, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { useUpdateSupportTicket } from "@/hooks/useMutations";
import { LIGHT_ALERT } from "@/lib/ui/glassActionChrome";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import { cn } from "@/lib/utils";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";

export function TicketInternalNotesCard({
  ticketId,
  notes,
  decisionActor,
}: {
  ticketId: string;
  notes: string | null;
  decisionActor?: AdminRequestReviewer | null;
}) {
  const updateMutation = useUpdateSupportTicket();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");
  const [clearOpen, setClearOpen] = useState(false);

  // Keep draft in sync when server notes change while not editing
  const [prevNotes, setPrevNotes] = useState(notes ?? "");
  if ((notes ?? "") !== prevNotes && !editing) {
    setPrevNotes(notes ?? "");
    setDraft(notes ?? "");
  }

  const startEdit = () => {
    setDraft(notes ?? "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(notes ?? "");
    setEditing(false);
  };

  const save = () => {
    updateMutation.mutate(
      { ticketId, notes: draft.trim() || null, decisionActor },
      {
        onSuccess: () => {
          setEditing(false);
          setPrevNotes(draft.trim());
        },
      },
    );
  };

  const clearNotes = () => {
    updateMutation.mutate(
      { ticketId, notes: null, decisionActor },
      {
        onSuccess: () => {
          setClearOpen(false);
          setEditing(false);
          setDraft("");
          setPrevNotes("");
        },
      },
    );
  };

  const hasNotes = Boolean(notes?.trim());

  const notesActions = !editing ? (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-gray-600 hover:text-primary-admin"
        onClick={startEdit}
        aria-label="Edit notes"
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        disabled={!hasNotes || updateMutation.isPending}
        onClick={() => setClearOpen(true)}
        aria-label="Clear notes"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  ) : (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={updateMutation.isPending}
        onClick={cancelEdit}
        aria-label="Cancel"
      >
        <X className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-emerald-600 hover:bg-emerald-50"
        disabled={updateMutation.isPending}
        onClick={save}
        aria-label="Save notes"
      >
        {updateMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
      </Button>
    </div>
  );

  return (
    <div className="surface-card rounded-xl border border-teal-200/70 bg-teal-50/50">
      <TicketSectionHeader
        variant="light"
        icon={<StickyNote className="size-5" />}
        title="Internal Notes"
        subtitle="Admin-only. Not visible to the requester."
        trailing={notesActions}
        iconToneClassName="border-teal-300/70 bg-teal-100/90 text-teal-700"
        className="mb-3"
      />

      {editing ? (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Internal notes for the support team…"
          rows={4}
          maxLength={2000}
          className="min-h-[100px] resize-none border-gray-300 bg-white text-sm"
        />
      ) : (
        <p
          className={cn(
            "whitespace-pre-wrap text-sm",
            hasNotes ? "text-gray-700" : "text-gray-400 italic",
          )}
        >
          {hasNotes ? notes : "No internal notes yet."}
        </p>
      )}

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent className={LIGHT_ALERT.content}>
          <AlertDialogHeader>
            <AlertDialogTitle className={LIGHT_ALERT.title}>
              Clear internal notes?
            </AlertDialogTitle>
            <AlertDialogDescription className={LIGHT_ALERT.description}>
              This removes the notes from this ticket. You can add new notes
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={LIGHT_ALERT.footer}>
            <AlertDialogCancel
              disabled={updateMutation.isPending}
              className={LIGHT_ALERT.cancel}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={clearNotes}
              disabled={updateMutation.isPending}
              className={LIGHT_ALERT.destructive}
            >
              {updateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Clear notes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
