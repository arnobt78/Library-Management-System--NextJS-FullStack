"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Loader2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AdminAdjustFineDialog } from "@/components/admin/AdminAdjustFineDialog";
import { commitMutationCache } from "@/lib/query/mutationGateway";
import { patchBorrowFineUpdate, prependBorrowAuditEvent } from "@/lib/utils/patchBorrowCaches";
import { densifyActivityLog } from "@/lib/utils/patchActivityCaches";
import { showToast } from "@/lib/toast";

interface AdminBorrowFineMenuProps {
  recordId: string;
  disabled?: boolean;
}

async function patchFine(
  recordId: string,
  body: Record<string, unknown>,
): Promise<{ fineAmount: string; displayFineAmount: string; fineStatus: string }> {
  const res = await fetch(`/api/admin/borrow-requests/${recordId}/fine`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Fine action failed");
  }
  return data.data;
}

function fineAuditStatus(action: string): string {
  if (action === "waive") return "FINE_WAIVED";
  if (action === "paid") return "FINE_PAID";
  return "FINE_ADJUST";
}

export function AdminBorrowFineMenu({
  recordId,
  disabled,
}: AdminBorrowFineMenuProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const run = async (
    label: string,
    body: Record<string, unknown>,
  ) => {
    setBusy(true);
    const pending = showToast.pending("Fine update", `${label}…`);
    const action = String(body.action ?? "");
    try {
      const data = await patchFine(recordId, body);
      await commitMutationCache(queryClient, "fine.write", {
        snapshot: () => undefined,
        densify: () => {
          patchBorrowFineUpdate(queryClient, recordId, data);
          densifyActivityLog(queryClient, {
            actorId: session?.user?.id ?? null,
            actorName: session?.user?.name ?? null,
            actorEmail: session?.user?.email ?? null,
            action: "UPDATE",
            entityType: "borrow",
            entityId: recordId,
            details: { status: fineAuditStatus(action) },
          });
          prependBorrowAuditEvent(queryClient, {
            recordId,
            action: "UPDATE",
            details: { status: fineAuditStatus(action) },
            actorId: session?.user?.id ?? null,
            actorName: session?.user?.name ?? null,
            actorEmail: session?.user?.email ?? null,
          });
        },
      });
      pending.dismiss();
      showToast.success("Fine updated", label);
    } catch (e) {
      pending.dismiss();
      showToast.error(
        "Fine update failed",
        e instanceof Error ? e.message : "Try again",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            className="h-8 gap-1 border-gray-200"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <MoreHorizontal className="size-3.5" />
            )}
            Fine actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => run("Fine waived", { action: "waive" })}
          >
            Waive fine
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => run("Marked paid", { action: "paid" })}
          >
            Mark paid
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAdjustOpen(true)}>
            Adjust amount…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AdminAdjustFineDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        isPending={busy}
        onConfirm={(amount, reason) => {
          setAdjustOpen(false);
          void run("Fine adjusted", {
            action: "adjust",
            amount,
            ...(reason ? { reason } : {}),
          });
        }}
      />
    </>
  );
}
