/**
 * Admin Business Insights Page
 *
 * Server Component that fetches analytics data server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 */

import React, { Suspense } from "react";
import { getCompleteAnalyticsSnapshot } from "@/lib/admin/actions/analytics";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import type { AnalyticsData } from "@/lib/services/analytics";

export const runtime = "nodejs";

const AnalyticsData = async () => {
  // Fetch all analytics data on the server for SSR
  const data: AnalyticsData = await getCompleteAnalyticsSnapshot();

  return <AnalyticsCharts initialData={data} />;
};

const AnalyticsPage = () => (
  <section className="w-full max-w-full space-y-4 overflow-x-hidden sm:space-y-6">
    <div className="mb-6 sm:mb-8">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
        📊 Analytics Dashboard
      </h1>
      <p className="text-sm text-gray-600 sm:text-base">
        Comprehensive insights into library operations and user behavior
      </p>
    </div>
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
  </section>
);

export default AnalyticsPage;
