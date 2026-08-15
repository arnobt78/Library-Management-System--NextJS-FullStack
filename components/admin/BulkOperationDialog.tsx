/**
 * Minimal Automation bulk confirm — paste UUIDs (+ optional delete secret).
 * Optional “Load all pending” fills the textarea from a server list helper.
 * LIGHT_ALERT settle: stays open with Loader2 until mutation resolves.
 */
"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { LIGHT_ALERT, LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { parseBulkIdInput } from "@/lib/utils/parseBulkIds";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/toast";

export type BulkOperationDialogProps = {
  title: string;
  description: string;
  triggerLabel: string;
  triggerIcon?: ReactNode;
  triggerClassName?: string;
  /** Destructive confirm styling (delete / reject). */
  destructive?: boolean;
  requireDeleteSecret?: boolean;
  /** When set, shows “Load all pending” and fills IDs from this loader. */
  loadPendingIds?: () => Promise<string[]>;
  loadPendingLabel?: string;
  onConfirm: (args: {
    ids: string[];
    deleteSecret?: string;
  }) => Promise<void>;
};

export function BulkOperationDialog({
  title,
  description,
  triggerLabel,
  triggerIcon,
  triggerClassName,
  destructive = false,
  requireDeleteSecret = false,
  loadPendingIds,
  loadPendingLabel = "Load all pending",
  onConfirm,
}: BulkOperationDialogProps) {
  const [open, setOpen] = useState(false);
  const [idsText, setIdsText] = useState("");
  const [deleteSecret, setDeleteSecret] = useState("");
  const [settling, setSettling] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);

  const reset = () => {
    setIdsText("");
    setDeleteSecret("");
    setSettling(false);
    setLoadingPending(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (settling) return;
    setOpen(next);
    if (!next) reset();
  };

  const handleLoadPending = async () => {
    if (!loadPendingIds) return;
    setLoadingPending(true);
    try {
      const ids = await loadPendingIds();
      if (ids.length === 0) {
        showToast.info("Nothing Pending", "No pending items to load.");
        return;
      }
      setIdsText(ids.join("\n"));
      showToast.success("Loaded", `${ids.length} pending ID(s) ready.`);
    } catch (error) {
      showToast.error(
        "Load Failed",
        error instanceof Error ? error.message : "Unable to load pending IDs.",
      );
    } finally {
      setLoadingPending(false);
    }
  };

  const handleConfirm = async () => {
    const ids = parseBulkIdInput(idsText);
    if (ids.length === 0) {
      showToast.error("No IDs", "Paste at least one valid UUID.");
      return;
    }
    if (requireDeleteSecret && !deleteSecret.trim()) {
      showToast.error("Secret Required", "Enter ADMIN_DELETE_SECRET to continue.");
      return;
    }
    setSettling(true);
    try {
      await onConfirm({
        ids,
        deleteSecret: requireDeleteSecret ? deleteSecret : undefined,
      });
      setOpen(false);
      reset();
    } catch {
      // Toast handled by caller / mutation
      setSettling(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start",
            destructive && "text-red-600",
            triggerClassName,
          )}
        >
          {triggerIcon}
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className={LIGHT_ALERT.content}>
        <AlertDialogHeader>
          <AlertDialogTitle className={LIGHT_ALERT.title}>{title}</AlertDialogTitle>
          <AlertDialogDescription className={LIGHT_ALERT.description}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          {loadPendingIds ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={settling || loadingPending}
              onClick={() => void handleLoadPending()}
            >
              {loadingPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {loadPendingLabel}
            </Button>
          ) : null}
          <Textarea
            value={idsText}
            onChange={(e) => setIdsText(e.target.value)}
            disabled={settling}
            placeholder="Paste UUIDs — one per line, or comma-separated (max 100)"
            className="min-h-[120px] font-mono text-xs"
            aria-label="Entity IDs"
          />
          {requireDeleteSecret ? (
            <Input
              type="password"
              autoComplete="off"
              value={deleteSecret}
              onChange={(e) => setDeleteSecret(e.target.value)}
              disabled={settling}
              placeholder="ADMIN_DELETE_SECRET"
              aria-label="Delete secret"
            />
          ) : null}
        </div>
        <AlertDialogFooter className={LIGHT_ALERT.footer}>
          <AlertDialogCancel
            disabled={settling}
            className={LIGHT_ALERT.cancel}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={settling}
            className={cn(
              LIGHT_GLASS_CTA.host,
              destructive ? LIGHT_GLASS_CTA.delete : LIGHT_GLASS_CTA.edit,
            )}
            onClick={() => void handleConfirm()}
          >
            {settling ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {settling ? "Working…" : "Confirm"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
