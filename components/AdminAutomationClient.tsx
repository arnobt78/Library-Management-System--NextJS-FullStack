"use client";

/**
 * AdminAutomationClient Component
 *
 * Client Component for the Admin Automation Dashboard.
 * Uses React Query mutations for sending reminders and updating overdue fines.
 * Replaces server actions with client-side mutations for better UX.
 *
 * Features:
 * - Uses useSendDueReminders, useSendOverdueReminders, useUpdateOverdueFines mutations
 * - Shows toasts for success/error messages
 * - All existing UI, styling, and functionality preserved
 */

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useSendDueReminders,
  useSendOverdueReminders,
  useGenerateAllUserRecommendations,
  useUpdateTrendingBooks,
  useRefreshRecommendationCache,
} from "@/hooks/useMutations";
import {
  useBulkActivateBooks,
  useBulkApproveBorrowRequests,
  useBulkApproveUsers,
  useBulkDeactivateBooks,
  useBulkDeleteBooksAutomation,
  useBulkMakeAdminUsers,
  useBulkRejectBorrowRequests,
  useBulkRejectUsers,
  useBulkRemoveAdminUsers,
  listPendingBorrowRecordIds,
  listPendingSignupUserIds,
} from "@/hooks/useBulkMutations";
import { BulkOperationDialog } from "@/components/admin/BulkOperationDialog";
import { useReminderStats, useExportStats } from "@/hooks/useQueries";
import { showToast } from "@/lib/toast";
import FineManagement from "@/components/FineManagement";
import { useRouter } from "next/navigation";
import { commitMutationCache } from "@/lib/query/mutationGateway";
import { densifyActivityLog } from "@/lib/utils/patchActivityCaches";
import {
  adminExportActivityMeta,
  downloadAdminExport,
  type AdminExportFormat,
  type AdminExportKind,
} from "@/lib/utils/adminExportDownload";
import { queryKeys } from "@/lib/query/keys";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle,
  Clock,
  Download,
  Mail,
  RefreshCw,
  Send,
  Shield,
  ShieldOff,
  Sparkles,
  Trash2,
  TrendingUp,
  UserX,
  Wand2,
  X,
} from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";

// Types for reminder and export stats
interface ReminderStats {
  dueSoon: number;
  overdue: number;
  remindersSentToday: number;
}

interface ExportStats {
  totalBooks: number;
  totalUsers: number;
  totalBorrows: number;
  lastExportDate?: string;
}

interface AdminAutomationClientProps {
  /**
   * Initial reminder stats from SSR (prevents duplicate fetch)
   */
  initialReminderStats?: ReminderStats;
  /**
   * Initial export stats from SSR (prevents duplicate fetch)
   */
  initialExportStats?: ExportStats;
  /**
   * Initial fine config from SSR (prevents duplicate fetch)
   */
  initialFineConfig?: import("@/lib/services/admin").FineConfig;
  searchParams: {
    success?: string;
    error?: string;
    count?: string;
    failed?: string;
    users?: string;
    recommendations?: string;
  };
}

const AdminAutomationClient: React.FC<AdminAutomationClientProps> = ({
  initialReminderStats,
  initialExportStats,
  initialFineConfig,
  searchParams: params,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [exportBusyKind, setExportBusyKind] = useState<string | null>(null);

  // React Query hooks for dynamic stats (updates immediately)
  const { data: reminderStatsData } = useReminderStats(initialReminderStats);

  const { data: exportStatsData } = useExportStats(initialExportStats);

  const runAdminExport = async (args: {
    kind: AdminExportKind;
    format: AdminExportFormat;
    startDate?: string;
    endDate?: string;
  }) => {
    const busyKey = `${args.kind}:${args.format}`;
    setExportBusyKind(busyKey);
    try {
      await downloadAdminExport(args);
      const meta = adminExportActivityMeta(args.kind);
      const su = session?.user;
      await commitMutationCache(queryClient, "operations.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyActivityLog(queryClient, {
            actorId: su?.id ?? null,
            actorName: su?.name?.trim() || null,
            actorEmail: su?.email ?? null,
            actorUniversityCard: null,
            action: "UPDATE",
            entityType: meta.entityType,
            entityId: null,
            details: {
              status: meta.status,
              format: args.format,
              ...(args.startDate ? { startDate: args.startDate } : {}),
              ...(args.endDate ? { endDate: args.endDate } : {}),
            },
          });
          queryClient.setQueryData(
            queryKeys.admin.exportStats,
            (old: ExportStats | undefined) =>
              old
                ? { ...old, lastExportDate: new Date().toISOString() }
                : old,
          );
        },
      });
      showToast.success("Export Ready", `Downloaded ${args.kind} ${args.format.toUpperCase()}.`);
    } catch (error) {
      showToast.error(
        "Export Failed",
        error instanceof Error ? error.message : "Unable to export data.",
      );
    } finally {
      setExportBusyKind(null);
    }
  };

  // CRITICAL: Always prefer React Query data over initial data
  // React Query data is fresh and updates immediately after mutations
  // initial data is only used as fallback during initial load
  // CRITICAL: Ensure all counts are numbers (not strings or BigInt)
  const reminderStats: ReminderStats = reminderStatsData
    ? {
        dueSoon: Number(reminderStatsData.dueSoon || 0),
        overdue: Number(reminderStatsData.overdue || 0),
        remindersSentToday: Number(reminderStatsData.remindersSentToday || 0),
      }
    : initialReminderStats
      ? {
          dueSoon: Number(initialReminderStats.dueSoon || 0),
          overdue: Number(initialReminderStats.overdue || 0),
          remindersSentToday: Number(
            initialReminderStats.remindersSentToday || 0,
          ),
        }
      : {
          dueSoon: 0,
          overdue: 0,
          remindersSentToday: 0,
        };

  const exportStats: ExportStats = exportStatsData ??
    initialExportStats ?? {
      totalBooks: 0,
      totalUsers: 0,
      totalBorrows: 0,
    };

  // React Query mutations
  const sendDueRemindersMutation = useSendDueReminders();
  const sendOverdueRemindersMutation = useSendOverdueReminders();
  const generateRecommendationsMutation = useGenerateAllUserRecommendations();
  const updateTrendingMutation = useUpdateTrendingBooks();
  const refreshCacheMutation = useRefreshRecommendationCache();
  const bulkActivateBooks = useBulkActivateBooks();
  const bulkDeactivateBooks = useBulkDeactivateBooks();
  const bulkDeleteBooks = useBulkDeleteBooksAutomation();
  const bulkApproveUsers = useBulkApproveUsers();
  const bulkRejectUsers = useBulkRejectUsers();
  const bulkMakeAdmin = useBulkMakeAdminUsers();
  const bulkRemoveAdmin = useBulkRemoveAdminUsers();
  const bulkApproveBorrows = useBulkApproveBorrowRequests();
  const bulkRejectBorrows = useBulkRejectBorrowRequests();
  const [bulkRemindersBusy, setBulkRemindersBusy] = useState(false);

  const runBulkSendReminders = async () => {
    setBulkRemindersBusy(true);
    try {
      await Promise.all([
        sendDueRemindersMutation.mutateAsync(),
        sendOverdueRemindersMutation.mutateAsync(),
      ]);
    } catch {
      // Per-mutation toasts already shown
    } finally {
      setBulkRemindersBusy(false);
    }
  };

  // Local state to track successful actions for UI feedback
  // (since we're using mutations instead of URL params now)
  const [recentActions, setRecentActions] = useState<{
    recommendationsGenerated?: boolean;
    trendingUpdated?: boolean;
    cacheRefreshed?: boolean;
  }>({});

  const markRecentAction = (action: keyof typeof recentActions) => {
    setRecentActions((previous) => ({ ...previous, [action]: true }));
    setTimeout(() => {
      setRecentActions((previous) => ({ ...previous, [action]: false }));
    }, 5000);
  };

  // Display toasts for server-side messages (from URL params)
  useEffect(() => {
    if (params.success === "due-soon-sent") {
      const count = params.count || "0";
      const failed = params.failed || "0";
      showToast.success(
        "Due Soon Reminders Sent",
        `Successfully sent ${count} due soon reminder(s) via email.${
          failed !== "0" ? ` ${failed} reminder(s) failed to send.` : ""
        }`,
      );
      router.replace("/admin/automation", undefined);
    }
    if (params.success === "overdue-sent") {
      const count = params.count || "0";
      const failed = params.failed || "0";
      showToast.success(
        "Overdue Reminders Sent",
        `Successfully sent ${count} overdue reminder(s) via email.${
          failed !== "0" ? ` ${failed} reminder(s) failed to send.` : ""
        }`,
      );
      router.replace("/admin/automation", undefined);
    }
    if (params.error === "due-soon-failed") {
      showToast.error(
        "Failed to Send Due Soon Reminders",
        "There was an error sending due soon reminders. Please try again.",
      );
      router.replace("/admin/automation", undefined);
    }
    if (params.error === "overdue-failed") {
      showToast.error(
        "Failed to Send Overdue Reminders",
        "There was an error sending overdue reminders. Please try again.",
      );
      router.replace("/admin/automation", undefined);
    }

    // Note: Recommendation action toasts are now handled by React Query mutations
    // (useGenerateAllUserRecommendations, useUpdateTrendingBooks, useRefreshRecommendationCache)
    // These mutations show toasts automatically on success/error
    // We keep the URL param cleanup for backward compatibility
    if (
      params.success === "recommendations-generated" ||
      params.success === "trending-updated" ||
      params.success === "cache-refreshed"
    ) {
      router.replace("/admin/automation", undefined);
    }
  }, [params, router]);

  // Handler functions for mutations
  const handleSendDueSoonReminders = () => {
    // CRITICAL: Double-check condition before executing mutation
    // This prevents any accidental execution even if click somehow gets through
    // CRITICAL: Convert to number to handle string "0" or BigInt cases
    const dueSoonCount = Number(reminderStats?.dueSoon || 0);
    if (dueSoonCount === 0 || sendDueRemindersMutation.isPending) {
      console.warn(
        "Cannot send due soon reminders: count is 0 or already pending",
        { dueSoonCount, isPending: sendDueRemindersMutation.isPending },
      );
      return;
    }
    sendDueRemindersMutation.mutate();
  };

  const handleSendOverdueReminders = () => {
    // CRITICAL: Double-check condition before executing mutation
    // This prevents any accidental execution even if click somehow gets through
    // CRITICAL: Convert to number to handle string "0" or BigInt cases
    const overdueCount = Number(reminderStats?.overdue || 0);
    if (overdueCount === 0 || sendOverdueRemindersMutation.isPending) {
      console.warn(
        "Cannot send overdue reminders: count is 0 or already pending",
        { overdueCount, isPending: sendOverdueRemindersMutation.isPending },
      );
      return;
    }
    sendOverdueRemindersMutation.mutate();
  };

  return (
    <AdminPageShell
      header={
        <AdminPageHeader
          title="Automation"
          description="Reminders, bulk jobs, and data export"
          icon={Wand2}
        />
      }
      kpis={
        <StatCardGrid>
          <StatCard
            title="Due Soon"
            value={reminderStats?.dueSoon || 0}
            icon={Clock}
            hue="blue"
            badges={[{ label: "due in 2 days", hue: "blue" }]}
          />
          <StatCard
            title="Overdue"
            value={reminderStats?.overdue || 0}
            icon={AlertTriangle}
            hue="rose"
            badges={[{ label: "past due date", hue: "rose" }]}
          />
          <StatCard
            title="Reminders Sent"
            value={reminderStats?.remindersSentToday || 0}
            icon={Send}
            hue="emerald"
            badges={[{ label: "today", hue: "emerald" }]}
          />
          <StatCard
            title="Total Records"
            value={
              (exportStats?.totalBooks || 0) +
              (exportStats?.totalUsers || 0) +
              (exportStats?.totalBorrows || 0)
            }
            icon={BarChart3}
            hue="violet"
            badges={[{ label: "books + users + borrows", hue: "violet" }]}
          />
        </StatCardGrid>
      }
    >
      {/* Success/Error Messages - Keep all existing messages */}
      {params.success === "due-soon-sent" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                ✅ Due Soon Reminders Sent Successfully!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Successfully sent {params.count} due soon reminder(s) via
                  email.
                  {params.failed &&
                    ` ${params.failed} reminder(s) failed to send.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {params.success === "overdue-sent" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                ✅ Overdue Reminders Sent Successfully!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Successfully sent {params.count} overdue reminder(s) via
                  email.
                  {params.failed &&
                    ` ${params.failed} reminder(s) failed to send.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {params.error === "due-soon-failed" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                ❌ Failed to Send Due Soon Reminders
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  There was an error sending due soon reminders. Please try
                  again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {params.error === "overdue-failed" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                ❌ Failed to Send Overdue Reminders
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  There was an error sending overdue reminders. Please try
                  again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendation Success Messages - Keep all existing messages */}
      {params.success === "recommendations-generated" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                ✅ Recommendations Generated Successfully!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Generated {params.recommendations} personalized
                  recommendations for {params.users} users using deterministic
                  rules.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {params.success === "trending-updated" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                ✅ Trending Books Updated Successfully!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Updated trending books data. Found {params.count} trending
                  books based on recent borrowing activity.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {params.success === "cache-refreshed" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                ✅ Recommendations Refreshed!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Recommendation queries will refetch current database results.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendation Error Messages - Keep all existing messages */}
      {params.error === "recommendations-failed" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                ❌ Failed to Generate Recommendations
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  There was an error generating recommendations. Please try
                  again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {params.error === "trending-failed" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                ❌ Failed to Update Trending Books
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  There was an error updating trending books. Please try again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {params.error === "cache-failed" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                ❌ Failed to Refresh Cache
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  There was an error refreshing the recommendation cache. Please
                  try again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Reminders Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium sm:text-lg">
            📧 Auto-Reminders
          </CardTitle>
          <p className="text-xs text-gray-600 sm:text-sm">
            Automated email reminders for due dates and overdue books
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Due Soon Reminders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  Due Soon Reminders
                </h4>
                <Badge
                  variant="outline"
                  className="border-blue-200 text-blue-600"
                >
                  {reminderStats?.dueSoon || 0} books
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                Send reminders to users whose books are due within 2 days
              </p>
              {Number(reminderStats?.dueSoon || 0) === 0 &&
              !sendDueRemindersMutation.isPending ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full" style={{ pointerEvents: "auto" }}>
                        <Button
                          className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={true}
                          type="button"
                          aria-disabled={true}
                        >
                          <Mail className="size-4" />
                          Send Due Soon Reminders
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>No users with books due soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  onClick={handleSendDueSoonReminders}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={sendDueRemindersMutation.isPending}
                  type="button"
                >
                  <Mail className="size-4" />
                  {sendDueRemindersMutation.isPending
                    ? "Sending..."
                    : "Send Due Soon Reminders"}
                </Button>
              )}
            </div>

            {/* Overdue Reminders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Overdue Reminders</h4>
                <Badge
                  variant="outline"
                  className="border-red-200 text-red-600"
                >
                  {reminderStats?.overdue || 0} books
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                Send urgent reminders for books that are past their due date
              </p>
              {Number(reminderStats?.overdue || 0) === 0 &&
              !sendOverdueRemindersMutation.isPending ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full" style={{ pointerEvents: "auto" }}>
                        <Button
                          variant="destructive"
                          className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={true}
                          type="button"
                          aria-disabled={true}
                        >
                          <Mail className="size-4" />
                          Send Overdue Reminders
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>No users with overdue books</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  onClick={handleSendOverdueReminders}
                  variant="destructive"
                  className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={sendOverdueRemindersMutation.isPending}
                  type="button"
                >
                  <Mail className="size-4" />
                  {sendOverdueRemindersMutation.isPending
                    ? "Sending..."
                    : "Send Overdue Reminders"}
                </Button>
              )}
            </div>

            {/* Hold READY — cron-driven; no invent last-run DB */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-medium text-gray-900">Hold READY Delivery</h4>
                <Badge
                  variant="outline"
                  className="shrink-0 border-emerald-200 text-emerald-700"
                >
                  Cron
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                When a waitlisted hold becomes READY, email + in-app{" "}
                <span className="font-medium text-gray-800">HOLD_READY</span>{" "}
                bells are delivered by the reservation outbox cron — not this
                manual send button.
              </p>
              <div className="rounded-md border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900 sm:text-sm">
                <p className="font-medium">Job status</p>
                <p className="mt-1 text-emerald-800/90">
                  Scheduled via{" "}
                  <code className="rounded bg-white/70 px-1 py-0.5 text-[0.7rem] sm:text-xs">
                    /api/cron/reservation-notifications
                  </code>
                  . Last-run timestamps are not stored in the database; check
                  Vercel Cron logs or hit the route with{" "}
                  <code className="rounded bg-white/70 px-1 py-0.5 text-[0.7rem] sm:text-xs">
                    CRON_SECRET
                  </code>{" "}
                  for a live delivery count.
                </p>
              </div>
            </div>
          </div>

          {/* Reminder Settings */}
          <div className="mt-4 rounded-lg bg-gray-50 p-3 sm:mt-6 sm:p-4">
            <h5 className="mb-2 text-sm font-medium text-gray-900 sm:text-base">
              Reminder Settings
            </h5>
            <div className="grid grid-cols-1 gap-3 text-xs sm:gap-4 sm:text-sm md:grid-cols-3">
              <div>
                <span className="font-medium text-gray-700">Due Soon:</span>
                <span className="ml-2 text-gray-600">
                  2 days before due date
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Overdue:</span>
                <span className="ml-2 text-gray-600">Daily after due date</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Frequency:</span>
                <span className="ml-2 text-gray-600">Once per day maximum</span>
              </div>
            </div>

            {/* Fine Update Section */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <FineManagement initialFineConfig={initialFineConfig} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Recommendations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium sm:text-lg">
            🎯 Rule-based Recommendations
          </CardTitle>
          <p className="text-xs text-gray-600 sm:text-sm">
            Deterministic genre/author/trending recommendations (no external AI)
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            {/* Recommendation Engine */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">
                Recommendation Engine
              </h4>
              <div className="space-y-2">
                <div
                  className={`flex items-center justify-between rounded-lg p-3 ${
                    params.success === "recommendations-generated" ||
                    recentActions.recommendationsGenerated
                      ? "border-2 border-green-300 bg-green-100"
                      : "bg-green-50"
                  }`}
                >
                  <div>
                    <p
                      className={`font-medium ${
                        params.success === "recommendations-generated" ||
                        recentActions.recommendationsGenerated
                          ? "text-green-900"
                          : "text-green-900"
                      }`}
                    >
                      Genre-based
                    </p>
                    <p
                      className={`text-sm ${
                        params.success === "recommendations-generated" ||
                        recentActions.recommendationsGenerated
                          ? "text-green-700"
                          : "text-green-600"
                      }`}
                    >
                      Based on user&apos;s favorite genres
                    </p>
                  </div>
                  <Badge
                    className={`${
                      params.success === "recommendations-generated" ||
                      recentActions.recommendationsGenerated
                        ? "border border-green-400 bg-green-200 text-green-900"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {params.success === "recommendations-generated" ||
                    recentActions.recommendationsGenerated
                      ? "Recently Updated"
                      : "Active"}
                  </Badge>
                </div>
                <div
                  className={`flex items-center justify-between rounded-lg p-3 ${
                    params.success === "recommendations-generated" ||
                    recentActions.recommendationsGenerated
                      ? "border-2 border-blue-300 bg-blue-100"
                      : "bg-blue-50"
                  }`}
                >
                  <div>
                    <p
                      className={`font-medium ${
                        params.success === "recommendations-generated" ||
                        recentActions.recommendationsGenerated
                          ? "text-blue-900"
                          : "text-blue-900"
                      }`}
                    >
                      Author-based
                    </p>
                    <p
                      className={`text-sm ${
                        params.success === "recommendations-generated" ||
                        recentActions.recommendationsGenerated
                          ? "text-blue-700"
                          : "text-blue-600"
                      }`}
                    >
                      Based on user&apos;s favorite authors
                    </p>
                  </div>
                  <Badge
                    className={`${
                      params.success === "recommendations-generated" ||
                      recentActions.recommendationsGenerated
                        ? "border border-blue-400 bg-blue-200 text-blue-900"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {params.success === "recommendations-generated" ||
                    recentActions.recommendationsGenerated
                      ? "Recently Updated"
                      : "Active"}
                  </Badge>
                </div>
                <div
                  className={`flex items-center justify-between rounded-lg p-3 ${
                    params.success === "trending-updated" ||
                    recentActions.trendingUpdated
                      ? "border-2 border-purple-300 bg-purple-100"
                      : "bg-purple-50"
                  }`}
                >
                  <div>
                    <p
                      className={`font-medium ${
                        params.success === "trending-updated" ||
                        recentActions.trendingUpdated
                          ? "text-purple-900"
                          : "text-purple-900"
                      }`}
                    >
                      Trending
                    </p>
                    <p
                      className={`text-sm ${
                        params.success === "trending-updated" ||
                        recentActions.trendingUpdated
                          ? "text-purple-700"
                          : "text-purple-600"
                      }`}
                    >
                      Most borrowed books recently
                    </p>
                  </div>
                  <Badge
                    className={`${
                      params.success === "trending-updated" ||
                      recentActions.trendingUpdated
                        ? "border border-purple-400 bg-purple-200 text-purple-900"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {params.success === "trending-updated" ||
                    recentActions.trendingUpdated
                      ? "Recently Updated"
                      : "Active"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Recommendation Actions */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">
                Recommendation Actions
              </h4>
              <div className="space-y-2">
                <Button
                  onClick={() =>
                    generateRecommendationsMutation.mutate(undefined, {
                      onSuccess: () =>
                        markRecentAction("recommendationsGenerated"),
                    })
                  }
                  className={`w-full break-words disabled:opacity-50 ${
                    params.success === "recommendations-generated" ||
                    recentActions.recommendationsGenerated
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                  disabled={generateRecommendationsMutation.isPending}
                  type="button"
                >
                  <Sparkles className="size-4" />
                  <span className="break-words text-xs sm:text-sm">
                    {generateRecommendationsMutation.isPending
                      ? "Generating..."
                      : "Generate All User Recommendations"}
                  </span>
                </Button>
                <Button
                  onClick={() =>
                    updateTrendingMutation.mutate(undefined, {
                      onSuccess: () => markRecentAction("trendingUpdated"),
                    })
                  }
                  className={`w-full break-words disabled:opacity-50 ${
                    params.success === "trending-updated" ||
                    recentActions.trendingUpdated
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  disabled={updateTrendingMutation.isPending}
                  type="button"
                >
                  <TrendingUp className="size-4" />
                  <span className="break-words text-xs sm:text-sm">
                    {updateTrendingMutation.isPending
                      ? "Updating..."
                      : "Update Trending Books"}
                  </span>
                </Button>
                <Button
                  onClick={() =>
                    refreshCacheMutation.mutate(undefined, {
                      onSuccess: () => markRecentAction("cacheRefreshed"),
                    })
                  }
                  className={`w-full break-words disabled:opacity-50 ${
                    params.success === "cache-refreshed" ||
                    recentActions.cacheRefreshed
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  disabled={refreshCacheMutation.isPending}
                  type="button"
                >
                  <RefreshCw className="size-4" />
                  <span className="break-words text-xs sm:text-sm">
                    {refreshCacheMutation.isPending
                      ? "Refreshing..."
                      : "Refresh Recommendations"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium sm:text-lg">
            ⚡ Bulk Operations
          </CardTitle>
          <p className="text-xs text-gray-600 sm:text-sm">
            Paste UUIDs (or load all pending) — live bulk actions with densify
            invalidation
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Book Operations</h4>
              <div className="space-y-2">
                <BulkOperationDialog
                  title="Bulk Activate Books"
                  description="Paste book UUIDs to set isActive = true."
                  triggerLabel="Bulk Activate Books"
                  triggerIcon={<CheckCircle className="size-4" />}
                  onConfirm={async ({ ids }) => {
                    await bulkActivateBooks.mutateAsync(ids);
                  }}
                />
                <BulkOperationDialog
                  title="Bulk Deactivate Books"
                  description="Paste book UUIDs to set isActive = false."
                  triggerLabel="Bulk Deactivate Books"
                  triggerIcon={<X className="size-4" />}
                  onConfirm={async ({ ids }) => {
                    await bulkDeactivateBooks.mutateAsync(ids);
                  }}
                />
                <BulkOperationDialog
                  title="Bulk Delete Books"
                  description="Hard-delete books. Requires ADMIN_DELETE_SECRET. Blocked if active loans/holds exist."
                  triggerLabel="Bulk Delete Books"
                  triggerIcon={<Trash2 className="size-4" />}
                  destructive
                  requireDeleteSecret
                  onConfirm={async ({ ids, deleteSecret }) => {
                    await bulkDeleteBooks.mutateAsync({
                      bookIds: ids,
                      deleteSecret: deleteSecret ?? "",
                    });
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">User Operations</h4>
              <div className="space-y-2">
                <BulkOperationDialog
                  title="Bulk Approve Users"
                  description="Approve signup users by UUID. Demo accounts are skipped."
                  triggerLabel="Bulk Approve Users"
                  triggerIcon={<Check className="size-4" />}
                  loadPendingIds={listPendingSignupUserIds}
                  loadPendingLabel="Load all pending signups"
                  onConfirm={async ({ ids }) => {
                    await bulkApproveUsers.mutateAsync(ids);
                  }}
                />
                <BulkOperationDialog
                  title="Bulk Reject Users"
                  description="Reject signup users by UUID. Demo accounts are skipped."
                  triggerLabel="Bulk Reject Users"
                  triggerIcon={<UserX className="size-4" />}
                  destructive
                  loadPendingIds={listPendingSignupUserIds}
                  loadPendingLabel="Load all pending signups"
                  onConfirm={async ({ ids }) => {
                    await bulkRejectUsers.mutateAsync(ids);
                  }}
                />
                <BulkOperationDialog
                  title="Bulk Make Admin"
                  description="Promote users to ADMIN (ledger-aware). Demo / already-admin skipped."
                  triggerLabel="Bulk Make Admin"
                  triggerIcon={<Shield className="size-4" />}
                  onConfirm={async ({ ids }) => {
                    await bulkMakeAdmin.mutateAsync(ids);
                  }}
                />
                <BulkOperationDialog
                  title="Bulk Remove Admin"
                  description="Demote ADMIN users to USER (ledger-aware). Demo skipped."
                  triggerLabel="Bulk Remove Admin"
                  triggerIcon={<ShieldOff className="size-4" />}
                  destructive
                  onConfirm={async ({ ids }) => {
                    await bulkRemoveAdmin.mutateAsync(ids);
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Borrow Operations</h4>
              <div className="space-y-2">
                <BulkOperationDialog
                  title="Bulk Approve Requests"
                  description="Approve PENDING borrow requests by record UUID."
                  triggerLabel="Bulk Approve Requests"
                  triggerIcon={<CheckCircle className="size-4" />}
                  loadPendingIds={listPendingBorrowRecordIds}
                  loadPendingLabel="Load all pending requests"
                  onConfirm={async ({ ids }) => {
                    await bulkApproveBorrows.mutateAsync(ids);
                  }}
                />
                <BulkOperationDialog
                  title="Bulk Reject Requests"
                  description="Soft-cancel PENDING borrow requests by record UUID."
                  triggerLabel="Bulk Reject Requests"
                  triggerIcon={<X className="size-4" />}
                  destructive
                  loadPendingIds={listPendingBorrowRecordIds}
                  loadPendingLabel="Load all pending requests"
                  onConfirm={async ({ ids }) => {
                    await bulkRejectBorrows.mutateAsync(ids);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  disabled={
                    bulkRemindersBusy ||
                    sendDueRemindersMutation.isPending ||
                    sendOverdueRemindersMutation.isPending
                  }
                  onClick={() => void runBulkSendReminders()}
                >
                  <Mail className="size-4" />
                  {bulkRemindersBusy
                    ? "Sending…"
                    : "Bulk Send Reminders (due + overdue)"}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-yellow-50 p-3 sm:mt-6 sm:p-4">
            <div className="flex items-start">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-yellow-500" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Bulk Operations Notice
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Free-form bulk field edit is not offered — use
                    Activate/Deactivate for catalog status. Signup status uses
                    Approve/Reject. Combined reminders run the Due Soon +
                    Overdue jobs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium sm:text-lg">
            📊 Data Export
          </CardTitle>
          <p className="text-xs text-gray-600 sm:text-sm">
            Export library data in various formats for analysis and backup
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            {/* Export Options */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Export Options</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div>
                    <p className="font-medium text-gray-900">Books Data</p>
                    <p className="text-sm text-gray-600">
                      {exportStats?.totalBooks || 0} books
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={exportBusyKind === "books:csv"}
                      onClick={() =>
                        void runAdminExport({ kind: "books", format: "csv" })
                      }
                    >
                      <Download className="size-4" />
                      CSV
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={exportBusyKind === "books:json"}
                      onClick={() =>
                        void runAdminExport({ kind: "books", format: "json" })
                      }
                    >
                      <Download className="size-4" />
                      JSON
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-gray-900">
                      Users Data
                    </p>
                    <p className="break-words text-sm text-gray-600">
                      {exportStats?.totalUsers || 0} users
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={exportBusyKind === "users:csv"}
                      onClick={() =>
                        void runAdminExport({ kind: "users", format: "csv" })
                      }
                    >
                      <Download className="size-4" />
                      CSV
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={exportBusyKind === "users:json"}
                      onClick={() =>
                        void runAdminExport({ kind: "users", format: "json" })
                      }
                    >
                      <Download className="size-4" />
                      JSON
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-gray-900">
                      Borrows Data
                    </p>
                    <p className="break-words text-sm text-gray-600">
                      {exportStats?.totalBorrows || 0} borrows
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={exportBusyKind === "borrows:csv"}
                      onClick={() =>
                        void runAdminExport({ kind: "borrows", format: "csv" })
                      }
                    >
                      <Download className="size-4" />
                      CSV
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={exportBusyKind === "borrows:json"}
                      onClick={() =>
                        void runAdminExport({ kind: "borrows", format: "json" })
                      }
                    >
                      <Download className="size-4" />
                      JSON
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-gray-900">
                      Analytics Data
                    </p>
                    <p className="break-words text-sm text-gray-600">
                      Complete analytics report
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={exportBusyKind === "analytics:csv"}
                      onClick={() =>
                        void runAdminExport({
                          kind: "analytics",
                          format: "csv",
                        })
                      }
                    >
                      <Download className="size-4" />
                      CSV
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={exportBusyKind === "analytics:json"}
                      onClick={() =>
                        void runAdminExport({
                          kind: "analytics",
                          format: "json",
                        })
                      }
                    >
                      <Download className="size-4" />
                      JSON
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Export Settings</h4>
              <div className="space-y-2">
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="break-words font-medium text-blue-900">
                    Date Range Export
                  </p>
                  <p className="break-words text-sm text-blue-600">
                    Export borrows data for a specific date range
                  </p>
                  <form
                    className="mt-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      const startDate = (
                        form.elements.namedItem("startDate") as HTMLInputElement
                      ).value;
                      const endDate = (
                        form.elements.namedItem("endDate") as HTMLInputElement
                      ).value;
                      if (!startDate || !endDate) return;
                      void runAdminExport({
                        kind: "borrows-range",
                        format: "csv",
                        startDate,
                        endDate,
                      });
                    }}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="date"
                        name="startDate"
                        className="w-full flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                        required
                      />
                      <input
                        type="date"
                        name="endDate"
                        className="w-full flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                        required
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={exportBusyKind === "borrows-range:csv"}
                      >
                        <Download className="size-4" />
                        Export
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="rounded-lg bg-green-50 p-3">
                  <p className="break-words font-medium text-green-900">
                    Last Export
                  </p>
                  <p className="break-words text-sm text-green-600">
                    {exportStats?.lastExportDate
                      ? new Date(exportStats.lastExportDate).toLocaleString()
                      : "No exports yet"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
};

export default AdminAutomationClient;
