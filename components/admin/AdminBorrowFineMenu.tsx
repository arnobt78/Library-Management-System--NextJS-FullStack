"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  MoreVertical,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminAdjustFineDialog } from "@/components/admin/AdminAdjustFineDialog";
import { commitMutationCache } from "@/lib/query/mutationGateway";
import {
  patchBorrowFineUpdate,
  prependBorrowAuditEvent,
} from "@/lib/utils/patchBorrowCaches";
import { densifyActivityLog } from "@/lib/utils/patchActivityCaches";
import { LIGHT_MENU } from "@/lib/ui/glassActionChrome";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface AdminBorrowFineMenuProps {
  recordId: string;
  disabled?: boolean;
  /** KPI card row — full-width justify-between trigger. */
  layout?: "default" | "kpi-row";
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
  layout = "default",
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

  const isKpiRow = layout === "kpi-row";

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled || busy}
            aria-label="Fine actions"
            className={cn(
              isKpiRow
                ? "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-dark-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                : LIGHT_MENU.trigger,
            )}
          >
            {isKpiRow ? (
              <>
                <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                  {busy ? (
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-gray-500" />
                  ) : (
                    <CircleDollarSign className="size-3.5 shrink-0 text-emerald-700" />
                  )}
                  <span className="truncate">Fine Actions</span>
                </span>
                <MoreVertical className="size-3.5 shrink-0 text-gray-500" />
              </>
            ) : (
              <>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MoreVertical className="size-4" />
                )}
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={LIGHT_MENU.content}>
          <DropdownMenuItem
            className={`${LIGHT_MENU.item} text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700`}
            onClick={() => run("Fine waived", { action: "waive" })}
          >
            <Ban className="size-3.5" />
            Waive Fine
          </DropdownMenuItem>
          <DropdownMenuItem
            className={`${LIGHT_MENU.item} text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700`}
            onClick={() => run("Marked paid", { action: "paid" })}
          >
            <CheckCircle2 className="size-3.5" />
            Mark Paid
          </DropdownMenuItem>
          <DropdownMenuSeparator className={LIGHT_MENU.separator} />
          <DropdownMenuItem
            className={LIGHT_MENU.item}
            onClick={() => setAdjustOpen(true)}
          >
            <Pencil className="size-3.5" />
            Adjust Amount…
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
