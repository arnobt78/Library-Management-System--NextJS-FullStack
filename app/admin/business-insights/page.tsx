/**
 * Admin Business Insights Page
 *
 * Server Component that fetches analytics data server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 * AdminPageShell: header outside Suspense; charts own KPI + panel stack (no overflow clip).
 */

import React, { Suspense } from "react";
import { getCompleteAnalyticsSnapshot } from "@/lib/admin/actions/analytics";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import type { AnalyticsData } from "@/lib/services/analytics";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { BarChart3 } from "lucide-react";

export const runtime = "nodejs";

const AnalyticsData = async () => {
  // Fetch all analytics data on the server for SSR
  const data: AnalyticsData = await getCompleteAnalyticsSnapshot();

  return <AnalyticsCharts initialData={data} />;
};

const AnalyticsPage = () => (
  <AdminPageShell
    header={
      <AdminPageHeader
        title="Business Insights"
        description="Circulation analytics and library trends"
        icon={BarChart3}
      />
    }
  >
    <Suspense
      fallback={
        <div
          className="grid min-h-[32rem] animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Loading business insights"
        >
          <div className="h-28 rounded-lg bg-white/20" />
          <div className="h-28 rounded-lg bg-white/20" />
          <div className="h-28 rounded-lg bg-white/20" />
          <div className="h-28 rounded-lg bg-white/20" />
        </div>
      }
    >
      <AnalyticsData />
    </Suspense>
  </AdminPageShell>
);

export default AnalyticsPage;
