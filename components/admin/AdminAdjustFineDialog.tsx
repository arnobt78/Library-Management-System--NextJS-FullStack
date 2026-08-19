"use client";

import { useState } from "react";
import { Loader2, Scale } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIGHT_ALERT } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";

interface AdminAdjustFineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onConfirm: (amount: number, reason?: string) => void;
}

export function AdminAdjustFineDialog({
  open,
  onOpenChange,
  isPending = false,
  onConfirm,
}: AdminAdjustFineDialogProps) {
  const [amount, setAmount] = useState("0.00");
  const [reason, setReason] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (isPending && !next) return;
    if (!next) {
      setAmount("0.00");
      setReason("");
    }
    onOpenChange(next);
  };

  const submit = () => {
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    onConfirm(parsed, reason.trim() || undefined);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className={LIGHT_ALERT.content}>
        <AlertDialogHeader>
          <AlertDialogTitle className={LIGHT_ALERT.title}>
            Adjust fine amount
          </AlertDialogTitle>
          <AlertDialogDescription className={LIGHT_ALERT.description}>
            Set the stored fine balance for this borrow. Open overdue loans
            still accrue until return, waive, or paid. This amount is frozen
            after the loan is closed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 px-1">
          <div className="space-y-1.5">
            <Label htmlFor="adjust-fine-amount">Amount ($)</Label>
            <Input
              id="adjust-fine-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-fine-reason">Reason (optional)</Label>
            <Input
              id="adjust-fine-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              placeholder="e.g. partial payment recorded offline"
            />
          </div>
        </div>
        <AlertDialogFooter className={LIGHT_ALERT.footer}>
          <AlertDialogCancel disabled={isPending} className={LIGHT_ALERT.cancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className={cn(
              "gap-1.5 bg-primary-admin text-white hover:bg-primary-admin/90",
            )}
            onClick={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Scale className="size-4" />
            )}
            Save adjustment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
