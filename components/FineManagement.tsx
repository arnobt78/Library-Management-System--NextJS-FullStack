"use client";

/**
 * FineManagement Component
 *
 * Daily rate config + optional force-update of stored open-overdue fines.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { useFineConfig } from "@/hooks/useQueries";
import {
  useUpdateFineConfig,
  useUpdateOverdueFines,
} from "@/hooks/useMutations";
import type { FineConfig } from "@/lib/services/admin";
import { Pencil, RefreshCw, Save, X } from "lucide-react";

interface FineManagementProps {
  initialFineConfig?: FineConfig;
}

export default function FineManagement({
  initialFineConfig,
}: FineManagementProps) {
  const [ssrTimestamp] = useState(() => Date.now());
  const { data: fineConfig, isLoading: configLoading } = useFineConfig(
    initialFineConfig,
    initialFineConfig ? ssrTimestamp : undefined,
  );

  const updateFineConfigMutation = useUpdateFineConfig();
  const updateOverdueFinesMutation = useUpdateOverdueFines();

  const fineAmount = fineConfig?.fineAmount || 1.0;
  const [draftAmount, setDraftAmount] = useState<number | null>(null);
  const editableAmount = draftAmount ?? fineAmount;
  const [isEditing, setIsEditing] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDraftAmount(null);
  };

  const handleSaveAmount = () => {
    if (isNaN(editableAmount) || editableAmount < 0) {
      return;
    }

    updateFineConfigMutation.mutate(
      { fineAmount: editableAmount },
      {
        onSuccess: () => {
          setIsEditing(false);
          setDraftAmount(null);
        },
      },
    );
  };

  const handleForceUpdate = () => {
    updateOverdueFinesMutation.mutate(
      { customFineAmount: fineAmount },
      { onSettled: () => setForceOpen(false) },
    );
  };

  const handleEditMode = () => {
    setIsEditing(true);
    setDraftAmount(fineAmount);
  };

  const busy =
    updateFineConfigMutation.isPending ||
    updateOverdueFinesMutation.isPending ||
    configLoading;

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h6 className="text-sm font-medium text-gray-900 sm:text-base">
            Fine Management
          </h6>
          <p className="text-xs text-gray-600 sm:text-sm">
            Daily rate drives live dashboards; stored amounts update on return,
            stamp, or force update.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 p-3 sm:p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-blue-900 sm:text-sm">
              Daily Fine Amount
            </label>
            <p className="mb-2 text-[10px] text-blue-600 sm:text-xs">
              Live Profile, Insights, and Borrow Queue recalculate open overdue
              balances immediately after save.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-blue-700 sm:text-sm">$</span>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editableAmount}
                  onChange={(e) =>
                    setDraftAmount(parseFloat(e.target.value) || 0)
                  }
                  className="w-20 rounded border border-blue-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 sm:text-sm"
                  placeholder="0.50"
                  autoFocus
                />
              ) : (
                <span className="w-20 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-900 sm:text-sm">
                  {configLoading ? "..." : fineAmount.toFixed(2)}
                </span>
              )}
              <span className="text-xs text-blue-700 sm:text-sm">per day</span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSaveAmount}
                  disabled={busy}
                  variant="outline"
                  size="sm"
                  className="w-full border-green-200 bg-green-100 text-green-700 hover:bg-green-200 sm:w-auto"
                >
                  <Save className="size-4" />
                  {updateFineConfigMutation.isPending ? "Saving..." : "Save Rate"}
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  disabled={busy}
                  variant="outline"
                  size="sm"
                  className="w-full border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 sm:w-auto"
                >
                  <X className="size-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleEditMode}
                  disabled={configLoading}
                  variant="outline"
                  size="sm"
                  className="w-full border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 sm:w-auto"
                >
                  <Pencil className="size-4" />
                  Edit Daily Rate
                </Button>
                <Button
                  onClick={() => setForceOpen(true)}
                  disabled={busy}
                  variant="outline"
                  size="sm"
                  className="w-full border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 sm:w-auto"
                >
                  <RefreshCw className="size-4" />
                  Force Update Stored
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={forceOpen} onOpenChange={setForceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force update stored fines?</AlertDialogTitle>
            <AlertDialogDescription>
              This rewrites{" "}
              <strong>fine_amount</strong> on every open overdue borrow to the
              current live calculation (${fineAmount.toFixed(2)}/day, pro-rata
              when rate history exists). Live UI already shows accrued balances;
              use this to align stored columns before reports or returns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateOverdueFinesMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={updateOverdueFinesMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleForceUpdate();
              }}
            >
              {updateOverdueFinesMutation.isPending
                ? "Updating..."
                : "Force update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
