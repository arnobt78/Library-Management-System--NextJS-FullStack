/**
 * Admin Business Insights Page
 *
 * Server Component fetches analytics SSR; client shell owns header period + charts.
 */

import React, { Suspense } from "react";
import { getCompleteAnalyticsSnapshot } from "@/lib/admin/actions/analytics";
import { BusinessInsightsClient } from "@/components/admin/BusinessInsightsClient";
import type { AnalyticsData } from "@/lib/services/analytics";

export const runtime = "nodejs";

const InsightsData = async () => {
  const data: AnalyticsData = await getCompleteAnalyticsSnapshot({
    borrowingTrendsDays: 90,
  });
  return <BusinessInsightsClient initialData={data} />;
};

const AnalyticsPage = () => (
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
    <InsightsData />
  </Suspense>
);

export default AnalyticsPage;
