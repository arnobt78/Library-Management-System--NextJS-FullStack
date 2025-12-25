"use client";

/**
 * FineManagement Component
 *
 * Component for managing fine configuration. Uses React Query hooks.
 * Integrates with useFineConfig query and useUpdateFineConfig mutation.
 *
 * Features:
 * - Uses useFineConfig hook for fetching current fine amount
 * - Uses useUpdateFineConfig mutation for updating fine amount
 * - Automatic cache invalidation on success
 * - Toast notifications via mutation callbacks
 * - Supports SSR initial data to prevent duplicate fetches
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useFineConfig } from "@/hooks/useQueries";
import {
  useUpdateFineConfig,
  useUpdateOverdueFines,
} from "@/hooks/useMutations";
import type { FineConfig } from "@/lib/services/admin";

interface FineManagementProps {
  /**
   * Initial fine config from SSR (prevents duplicate fetch)
   */
  initialFineConfig?: FineConfig;
}

export default function FineManagement({
  initialFineConfig,
}: FineManagementProps) {
  // Use React Query hook for fetching fine config with SSR initial data
  const { data: fineConfig, isLoading: configLoading } =
    useFineConfig(initialFineConfig);

  // Use React Query mutations
  const updateFineConfigMutation = useUpdateFineConfig();
  const updateOverdueFinesMutation = useUpdateOverdueFines();

  const fineAmount = fineConfig?.fineAmount || 1.0;
  const [editableAmount, setEditableAmount] = useState<number>(fineAmount);
  const [isEditing, setIsEditing] = useState(false);

  // Update editable amount when fine config loads
  useEffect(() => {
    if (fineConfig?.fineAmount) {
      setEditableAmount(fineConfig.fineAmount);
    }
  }, [fineConfig?.fineAmount]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditableAmount(fineAmount);
  };

  const handleSaveAmount = () => {
    if (isNaN(editableAmount) || editableAmount < 0) {
      return; // Validation handled by mutation
    }

    // First, update fine config
    updateFineConfigMutation.mutate(
      {
        fineAmount: editableAmount,
        updatedBy: "admin",
      },
      {
        onSuccess: () => {
          // Then, update overdue fines with the new amount
          updateOverdueFinesMutation.mutate(
            {
              customFineAmount: editableAmount,
            },
            {
              onSuccess: (_data) => {
                setIsEditing(false);
                // Cache invalidation handled by mutations
                // No need to reload page - React Query will update UI
              },
            }
          );
        },
      }
    );
  };

  const handleEditMode = () => {
    setIsEditing(true);
    setEditableAmount(fineAmount);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h6 className="text-sm font-medium text-gray-900 sm:text-base">
            Fine Management
          </h6>
          <p className="text-xs text-gray-600 sm:text-sm">
            Update fines for overdue books
          </p>
        </div>
      </div>

      {/* Dynamic Fine Amount Configuration */}
      <div className="rounded-lg bg-blue-50 p-3 sm:p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-blue-900 sm:text-sm">
              Daily Fine Amount
            </label>
            <p className="mb-2 text-[10px] text-blue-600 sm:text-xs">
              Set the amount charged per day for overdue books
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
                    setEditableAmount(parseFloat(e.target.value) || 0)
                  }
                  className="w-20 rounded border border-blue-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 sm:text-sm"
                  placeholder="1.00"
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
                  disabled={
                    updateFineConfigMutation.isPending ||
                    updateOverdueFinesMutation.isPending ||
                    configLoading
                  }
                  variant="outline"
                  size="sm"
                  className="w-full border-green-200 bg-green-100 text-green-700 hover:bg-green-200 sm:w-auto"
                >
                  {updateFineConfigMutation.isPending ||
                  updateOverdueFinesMutation.isPending
                    ? "Saving..."
                    : "Save Fine"}
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  disabled={
                    updateFineConfigMutation.isPending ||
                    updateOverdueFinesMutation.isPending
                  }
                  variant="outline"
                  size="sm"
                  className="w-full border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 sm:w-auto"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEditMode}
                disabled={configLoading}
                variant="outline"
                size="sm"
                className="w-full border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 sm:w-auto"
              >
                Update Fines
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
