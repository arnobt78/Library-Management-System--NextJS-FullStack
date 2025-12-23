/**
 * Admin Automation Page
 *
 * Server Component that fetches automation data server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 */

import React from "react";
import { getReminderStats } from "@/lib/admin/actions/reminders";
import { getExportStats } from "@/lib/admin/actions/data-export";
import {
  getDailyFineAmount,
  initializeDefaultConfigs,
} from "@/lib/admin/actions/config";
import {
  generateAllUserRecommendations,
  updateTrendingBooks,
  refreshRecommendationCache,
} from "@/lib/admin/actions/recommendations";
import { redirect } from "next/navigation";
import AdminAutomationClient from "@/components/AdminAutomationClient";
import type { FineConfig } from "@/lib/services/admin";

export const runtime = "nodejs";

// Server Actions for recommendation functions
async function handleGenerateAllUserRecommendations() {
  "use server";
  const results = await generateAllUserRecommendations();
  const totalUsers = results.length;
  const totalRecommendations = results.reduce(
    (sum, user) => sum + user.recommendations.length,
    0
  );

  redirect(
    `/admin/automation?success=recommendations-generated&users=${totalUsers}&recommendations=${totalRecommendations}`
  );
}

async function handleUpdateTrendingBooks() {
  "use server";
  const result = await updateTrendingBooks();
  redirect(
    `/admin/automation?success=trending-updated&count=${result.trendingCount}`
  );
}

async function handleRefreshRecommendationCache() {
  "use server";
  await refreshRecommendationCache();
  redirect("/admin/automation?success=cache-refreshed");
}

// Server Actions for Bulk Operations (Coming Soon)
async function handleBulkEditBooks() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-edit-books");
}

async function handleBulkActivateBooks() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-activate-books");
}

async function handleBulkDeactivateBooks() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-deactivate-books");
}

async function handleBulkDeleteBooks() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-delete-books");
}

async function handleBulkApproveUsers() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-approve-users");
}

async function handleBulkRejectUsers() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-reject-users");
}

async function handleBulkMakeAdmin() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-make-admin");
}

async function handleBulkRemoveAdmin() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-remove-admin");
}

async function handleBulkApproveRequests() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-approve-requests");
}

async function handleBulkRejectRequests() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-reject-requests");
}

async function handleBulkSendReminders() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-send-reminders");
}

async function handleBulkUpdateStatus() {
  "use server";
  redirect("/admin/automation?coming-soon=bulk-update-status");
}

const AutomationDashboard = async ({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
    count?: string;
    failed?: string;
    users?: string;
    recommendations?: string;
    "coming-soon"?: string;
  }>;
}) => {
  const params = await searchParams;

  // Fetch automation data server-side for SSR
  // Initialize default configs if they don't exist (for fine config)
  await initializeDefaultConfigs();

  const [reminderStats, exportStats, fineAmount] = await Promise.all([
    getReminderStats(),
    getExportStats(),
    getDailyFineAmount(),
  ]);

  // Transform fine amount to FineConfig format
  const initialFineConfig: FineConfig = {
    success: true,
    fineAmount,
  };

  return (
    <AdminAutomationClient
      initialReminderStats={reminderStats}
      initialExportStats={exportStats}
      initialFineConfig={initialFineConfig}
      searchParams={params}
      serverActions={{
        handleGenerateAllUserRecommendations,
        handleUpdateTrendingBooks,
        handleRefreshRecommendationCache,
        handleBulkEditBooks,
        handleBulkActivateBooks,
        handleBulkDeactivateBooks,
        handleBulkDeleteBooks,
        handleBulkApproveUsers,
        handleBulkRejectUsers,
        handleBulkMakeAdmin,
        handleBulkRemoveAdmin,
        handleBulkApproveRequests,
        handleBulkRejectRequests,
        handleBulkSendReminders,
        handleBulkUpdateStatus,
      }}
    />
  );
};

export default AutomationDashboard;
