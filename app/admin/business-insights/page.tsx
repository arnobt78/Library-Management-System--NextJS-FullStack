/**
 * Admin Business Insights Page
 *
 * Server Component that fetches analytics data server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 */

import React from "react";
import {
  getBorrowingTrends,
  getPopularBooks,
  getPopularGenres,
  getUserActivityPatterns,
  getOverdueAnalysis,
  getOverdueStats,
  getMonthlyStats,
  getSystemHealth,
} from "@/lib/admin/actions/analytics";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import type { AnalyticsData } from "@/lib/services/analytics";

export const runtime = "nodejs";

const AnalyticsPage = async () => {
  // Fetch all analytics data on the server for SSR
  const [
    borrowingTrends,
    popularBooks,
    popularGenres,
    userActivity,
    overdueBooks,
    overdueStats,
    monthlyStats,
    systemHealth,
  ] = await Promise.all([
    getBorrowingTrends(),
    getPopularBooks(10),
    getPopularGenres(),
    getUserActivityPatterns(),
    getOverdueAnalysis(),
    getOverdueStats(),
    getMonthlyStats(),
    getSystemHealth(),
  ]);

  const data: AnalyticsData = {
    borrowingTrends,
    popularBooks,
    popularGenres,
    userActivity,
    overdueBooks,
    overdueStats,
    monthlyStats,
    systemHealth,
  };

  return <AnalyticsCharts initialData={data} />;
};

export default AnalyticsPage;
