"use client";

/**
 * Admin Decline dialog for pending make-admin requests.
 * ReviewFormDialog chrome; textarea prefilled with DEFAULT_ADMIN_REJECTION_REASON.
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
import { DEFAULT_ADMIN_REJECTION_REASON } from "@/lib/admin/adminRequestConstants";
import { Loader2, X, XCircle } from "lucide-react";

type AdminRequestDeclineDialogProps = {
  open: boolean;
  applicantName: string;
  applicantEmail: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (rejectionReason: string) => void;
};

/**
 * Parent should remount via `key={requestId}` when opening for a new target
 * so the textarea reseeds with DEFAULT_ADMIN_REJECTION_REASON.
 */
export default function AdminRequestDeclineDialog({
  open,
  applicantName,
  applicantEmail,
  isPending,
  onOpenChange,
  onConfirm,
}: AdminRequestDeclineDialogProps) {
  const [reason, setReason] = useState(DEFAULT_ADMIN_REJECTION_REASON);

  const reasonOk = reason.trim().length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonOk || isPending) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="border-gray-600 bg-gray-800/95 [&>button]:text-white [&>button]:hover:text-white">
        <DialogHeader>
          <DialogTitle className="text-base text-light-100 sm:text-lg">
            Decline admin request
          </DialogTitle>
          <DialogDescription className="text-xs text-light-200/70 sm:text-sm">
            Decline access for {applicantName} ({applicantEmail}). This note is
            shown to the applicant and included in their email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-1.5 sm:space-y-2">
            <label
              htmlFor="admin-decline-reason"
              className="text-xs font-medium text-light-200 sm:text-sm"
            >
              Reason for decline
            </label>
            <textarea
              id="admin-decline-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              rows={5}
              maxLength={1000}
              required
              minLength={10}
              className="w-full resize-none rounded-md border border-gray-600 bg-gray-700/50 px-2.5 py-1.5 text-xs text-light-100 placeholder:text-light-200/50 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-60 sm:px-3 sm:py-2 sm:text-sm"
            />
            <p className="text-[10px] text-light-200/70 sm:text-xs">
              {reason.trim().length}/1000 · minimum 10 characters
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="w-full border-gray-500 bg-gray-600 text-xs text-white hover:bg-gray-500 hover:text-white sm:w-auto sm:text-sm"
            >
              <X className="size-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !reasonOk}
              className="w-full gap-1.5 bg-red-600 text-xs text-white hover:bg-red-700 sm:w-auto sm:text-sm"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              {isPending ? "Declining…" : "Decline request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
