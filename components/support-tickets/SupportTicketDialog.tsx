"use client";

/**
 * Shared create/edit dialog for support tickets.
 * - Create + user edit: subject, description, priority (iconized).
 * - Admin edit (`adminFields`): also status + Assigned To ("All admin").
 * Form body mounts only while open (keyed by ticket fields) so priority/status
 * always seed from live props — no stale useState / no setState-in-effect.
 * Does NOT auto-navigate to detail — parent decides (usually stay on list).
 * Parent: CR-0003 / REQ-0034
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, Send, X } from "lucide-react";
import {
  useCreateSupportTicket,
  useUpdateSupportTicket,
} from "@/hooks/useMutations";
import type {
  TicketPriority,
  TicketStatus,
} from "@/lib/validations/supportTicket";
import {
  ticketPriorityMultiOptions,
  ticketStatusMultiOptions,
} from "@/lib/ui/ticketOptions";
import { PersonSelectRow } from "@/components/ui/PersonSelectRow";
import { AllAdminLabel } from "@/components/support-tickets/AllAdminLabel";
import { cn } from "@/lib/utils";

const UNASSIGNED = "__unassigned__";

type TicketDialogMode = "create" | "edit";

export type AssignableAdminOption = {
  id: string;
  name: string;
  email: string;
  universityCard?: string | null;
};

interface SupportTicketDialogProps {
  mode?: TicketDialogMode;
  ticketId?: string;
  initialSubject?: string;
  initialDescription?: string;
  initialPriority?: TicketPriority;
  initialStatus?: TicketStatus;
  initialAssignedToId?: string | null;
  /** Admin list/detail edit — shows status + assignee controls */
  adminFields?: boolean;
  assignableAdmins?: AssignableAdminOption[];
  /** dark = user glass dialog; light = admin panel */
  variant?: "dark" | "light";
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (ticket: SupportTicketDetail) => void;
  onUpdated?: (ticket: SupportTicketDetail) => void;
}

type FormProps = Omit<SupportTicketDialogProps, "isOpen" | "onClose"> & {
  onClose: () => void;
};

/** Mounted only while dialog is open — fresh useState from props each open. */
function SupportTicketDialogForm({
  mode = "create",
  ticketId,
  initialSubject = "",
  initialDescription = "",
  initialPriority = "MEDIUM",
  initialStatus = "OPEN",
  initialAssignedToId = null,
  adminFields = false,
  assignableAdmins = [],
  variant = "dark",
  onClose,
  onCreated,
  onUpdated,
}: FormProps) {
  const isDark = variant === "dark";
  const PRIORITY_OPTIONS = ticketPriorityMultiOptions(isDark ? "dark" : "light");
  const STATUS_OPTIONS = ticketStatusMultiOptions(isDark ? "dark" : "light");

  const [subject, setSubject] = useState(
    mode === "create" ? "" : initialSubject,
  );
  const [description, setDescription] = useState(
    mode === "create" ? "" : initialDescription,
  );
  const [priority, setPriority] = useState<TicketPriority>(
    mode === "create" ? "MEDIUM" : initialPriority,
  );
  const [status, setStatus] = useState<TicketStatus>(
    mode === "create" ? "OPEN" : initialStatus,
  );
  const [assignedToId, setAssignedToId] = useState<string>(
    mode === "create" ? UNASSIGNED : (initialAssignedToId ?? UNASSIGNED),
  );

  const createMutation = useCreateSupportTicket();
  const updateMutation = useUpdateSupportTicket();
  const isPending =
    mode === "edit" ? updateMutation.isPending : createMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (trimmedSubject.length < 5 || trimmedDescription.length < 10) return;

    if (mode === "edit") {
      if (!ticketId) return;
      updateMutation.mutate(
        {
          ticketId,
          subject: trimmedSubject,
          description: trimmedDescription,
          priority,
          ...(adminFields
            ? {
                status,
                assignedToId:
                  assignedToId === UNASSIGNED ? null : assignedToId,
              }
            : {}),
        },
        {
          onSuccess: (ticket) => {
            onUpdated?.(ticket);
            onClose();
          },
        },
      );
      return;
    }

    createMutation.mutate(
      {
        subject: trimmedSubject,
        description: trimmedDescription,
        priority,
      },
      {
        onSuccess: (ticket) => {
          onCreated?.(ticket);
          onClose();
        },
      },
    );
  };

  const title = mode === "edit" ? "Edit Ticket" : "New Support Ticket";
  const description_ =
    mode === "edit"
      ? adminFields
        ? "Update subject, description, status, priority, or assignee."
        : "Update the subject, description, or priority of your ticket."
      : "Describe your issue and our support team will get back to you soon.";
  const submitLabel =
    mode === "edit"
      ? isPending
        ? "Saving…"
        : "Save Changes"
      : isPending
        ? "Submitting…"
        : "Submit Ticket";

  const canSubmit =
    subject.trim().length >= 5 && description.trim().length >= 10;

  const fieldClass = isDark
    ? "w-full rounded-md border border-gray-600 bg-gray-700/50 px-2.5 py-1.5 text-xs text-light-100 placeholder:text-light-200/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 sm:px-3 sm:py-2 sm:text-sm"
    : "w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-dark-400 focus:border-primary-admin focus:outline-none focus:ring-1 focus:ring-primary-admin disabled:opacity-60 sm:px-3 sm:py-2 sm:text-sm";

  const labelClass = isDark
    ? "text-xs font-medium text-light-200 sm:text-sm"
    : "text-xs font-medium text-gray-600 sm:text-sm";

  const selectTriggerClass = isDark
    ? "h-9 border-gray-600 bg-gray-700/50 text-light-100"
    : "h-9 border-gray-300 bg-white text-dark-400";

  const selectContentClass = isDark
    ? "border-gray-700 bg-dark-300 text-light-100"
    : undefined;

  const priorityMeta = PRIORITY_OPTIONS.find((o) => o.value === priority);
  const PriorityIcon = priorityMeta?.icon;

  return (
    <DialogContent
      className={cn(
        "sm:max-w-md",
        isDark
          ? "border-gray-600 bg-gray-800/95 [&>button]:text-white [&>button]:hover:text-white"
          : "border-gray-200 bg-white",
      )}
      onPointerDownOutside={(e) => {
        if (isPending) e.preventDefault();
      }}
      onEscapeKeyDown={(e) => {
        if (isPending) e.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle
          className={cn(
            "text-base sm:text-lg",
            isDark ? "text-light-100" : "text-dark-400",
          )}
        >
          {title}
        </DialogTitle>
        <DialogDescription
          className={cn(
            "text-xs sm:text-sm",
            isDark ? "text-light-200/70" : "text-gray-500",
          )}
        >
          {description_}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="space-y-1.5 sm:space-y-2">
          <label className={labelClass}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Short summary of your issue"
            disabled={isPending}
            maxLength={255}
            required
            minLength={5}
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <label className={labelClass}>Priority</label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as TicketPriority)}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Select priority">
                {priorityMeta ? (
                  <span className="inline-flex items-center gap-2">
                    {PriorityIcon ? (
                      <PriorityIcon
                        className={`size-3.5 shrink-0 ${priorityMeta.iconClassName}`}
                        aria-hidden
                      />
                    ) : null}
                    {priorityMeta.label}
                  </span>
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              {PRIORITY_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="inline-flex items-center gap-2">
                      <Icon
                        className={`size-3.5 shrink-0 ${option.iconClassName}`}
                        aria-hidden
                      />
                      {option.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {adminFields && mode === "edit" ? (
          <>
            <div className="space-y-1.5 sm:space-y-2">
              <label className={labelClass}>Status</label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as TicketStatus)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {STATUS_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="inline-flex items-center gap-2">
                          <Icon
                            className={`size-3.5 shrink-0 ${option.iconClassName}`}
                            aria-hidden
                          />
                          {option.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <label className={labelClass}>Assigned To</label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger
                  className={cn(
                    selectTriggerClass,
                    "h-auto min-h-9 py-1.5 [&>span]:w-auto [&>span]:flex-none",
                  )}
                >
                  <SelectValue placeholder="All admin">
                    {assignedToId === UNASSIGNED ? (
                      <AllAdminLabel variant={isDark ? "dark" : "light"} />
                    ) : (
                      (() => {
                        const admin = assignableAdmins.find(
                          (a) => a.id === assignedToId,
                        );
                        return admin ? (
                          <PersonSelectRow
                            fullName={admin.name}
                            email={admin.email}
                            universityCard={admin.universityCard}
                            variant={isDark ? "dark" : "light"}
                          />
                        ) : (
                          <AllAdminLabel variant={isDark ? "dark" : "light"} />
                        );
                      })()
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value={UNASSIGNED} className="py-2.5">
                    <AllAdminLabel variant={isDark ? "dark" : "light"} />
                  </SelectItem>
                  {assignableAdmins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id} className="py-1.5">
                      <PersonSelectRow
                        fullName={admin.name}
                        email={admin.email}
                        universityCard={admin.universityCard}
                        variant={isDark ? "dark" : "light"}
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}

        <div className="space-y-1.5 sm:space-y-2">
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain your issue in detail…"
            disabled={isPending}
            className={cn(fieldClass, "resize-none")}
            rows={5}
            required
            minLength={10}
            maxLength={2000}
          />
          <p
            className={cn(
              "text-[10px] sm:text-xs",
              isDark ? "text-light-200/70" : "text-gray-500",
            )}
          >
            {description.length}/2000 characters
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className={cn(
              "w-full text-xs sm:w-auto sm:text-sm",
              isDark &&
                "border-gray-500 bg-gray-600 text-white hover:bg-gray-500 hover:text-white",
            )}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !canSubmit}
            className="w-full gap-1.5 text-xs sm:w-auto sm:text-sm"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "edit" ? (
              <Pencil className="size-4" />
            ) : (
              <Send className="size-4" />
            )}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default function SupportTicketDialog({
  isOpen,
  onClose,
  mode = "create",
  ...formProps
}: SupportTicketDialogProps) {
  // Same mutation instances as the form — gate overlay close while pending.
  const createMutation = useCreateSupportTicket();
  const updateMutation = useUpdateSupportTicket();
  const isPending =
    mode === "edit" ? updateMutation.isPending : createMutation.isPending;

  const handleOpenChange = (open: boolean) => {
    if (!open && !isPending) onClose();
  };

  // Unmount on close (`isOpen ? …`) remounts with live props; key by ticket only.
  const formKey = `${mode}|${formProps.ticketId ?? "new"}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {isOpen ? (
        <SupportTicketDialogForm
          key={formKey}
          mode={mode}
          {...formProps}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}
