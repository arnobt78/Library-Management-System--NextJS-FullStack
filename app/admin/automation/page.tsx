/**
 * Admin Automation Page
 *
 * Server Component that fetches automation data server-side for SSR.
 * Bulk CTAs run client-side via BulkOperationDialog + useBulkMutations.
 */

import React from "react";
import { getReminderStats } from "@/lib/admin/actions/reminders";
import { getExportStats } from "@/lib/admin/actions/data-export";
import {
  getDailyFineAmount,
  initializeDefaultConfigs,
} from "@/lib/admin/actions/config";
import AdminAutomationClient from "@/components/AdminAutomationClient";
import type { FineConfig } from "@/lib/services/admin";

export const runtime = "nodejs";

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
  }>;
}) => {
  const params = await searchParams;

  await initializeDefaultConfigs();

  const [reminderStats, exportStats, fineAmount] = await Promise.all([
    getReminderStats(),
    getExportStats(),
    getDailyFineAmount(),
  ]);

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
    />
  );
};

export default AutomationDashboard;
