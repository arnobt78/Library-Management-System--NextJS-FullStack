"use client";

/**
 * AnalyticsCharts Component
 *
 * Client component that displays comprehensive analytics charts and metrics.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useBusinessInsights hook with initialData from SSR
 * - Displays skeleton loaders while fetching
 * - Shows error state if fetch fails
 * - All existing UI, styling, and functionality preserved
 */

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useBusinessInsights } from "@/hooks/useQueries";
import type { AnalyticsData } from "@/lib/services/analytics";
import ChartSkeleton from "@/components/skeletons/ChartSkeleton";
import GenericCardSkeleton from "@/components/skeletons/GenericCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { AlertTriangle, BookOpen, BookOpenCheck, Users } from "lucide-react";

interface AnalyticsChartsProps {
  /**
   * Initial analytics data from SSR (prevents duplicate fetch)
   */
  initialData?: AnalyticsData;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ initialData }) => {
  // React Query hook with SSR initial data
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    isError: analyticsError,
    error: analyticsErrorData,
  } = useBusinessInsights(
    {
      popularBooksLimit: 10,
    },
    initialData,
  );

  // CRITICAL: Always prefer React Query data over initialData
  // React Query data is fresh and updates immediately after mutations
  // initialData is only used as fallback during initial load
  const data: AnalyticsData | undefined = analyticsData ?? initialData;

  // Show skeleton while loading (only if no initial data)
  if (analyticsLoading && !initialData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Key Metrics Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <GenericCardSkeleton
              key={`metric-skeleton-${i}`}
              showHeader={false}
              showFooter={false}
              contentLines={2}
              lineHeight={4}
              useCardWrapper={false}
              className="rounded-lg border bg-white p-4 shadow-sm sm:p-6"
            />
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={`chart-skeleton-${i}`}
              className="rounded-lg border bg-white p-4 shadow-sm sm:p-6"
            >
              <Skeleton className="mb-4 h-7 w-40" />
              <ChartSkeleton
                variant={i === 2 ? "pie" : i % 2 === 0 ? "line" : "bar"}
                height={300}
              />
            </div>
          ))}
        </div>

        {/* Overdue Books Table Skeleton */}
        <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
          <Skeleton className="mb-4 h-7 w-40" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={`table-row-skeleton-${i}`} className="flex gap-4">
                <Skeleton className="h-6 flex-1" />
                <Skeleton className="h-6 flex-1" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (analyticsError && !initialData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="py-6 text-center sm:py-8">
          <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
            Failed to load analytics data
          </p>
          <p className="text-xs text-gray-500 sm:text-sm">
            {analyticsErrorData instanceof Error
              ? analyticsErrorData.message
              : "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!data) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="py-6 text-center sm:py-8">
          <p className="text-base font-medium text-gray-500 sm:text-lg">
            No analytics data available
          </p>
        </div>
      </div>
    );
  }
  // Prepare data for charts
  const trendsData = data.borrowingTrends.map((trend) => ({
    date: new Date(trend.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    borrows: trend.borrows,
    returns: trend.returns,
  }));

  const popularBooksData = data.popularBooks.map((book) => ({
    title:
      book.bookTitle.length > 20
        ? book.bookTitle.substring(0, 20) + "..."
        : book.bookTitle,
    borrows: book.totalBorrows,
    active: book.activeBorrows,
    returned: book.returnedBorrows,
  }));

  const genresData = data.popularGenres.map((genre) => ({
    name: genre.genre,
    value: genre.totalBorrows,
    books: genre.uniqueBooks,
  }));

  const userActivityData = data.userActivity.slice(0, 10).map((user) => ({
    name:
      user.userName.length > 15
        ? user.userName.substring(0, 15) + "..."
        : user.userName,
    borrows: user.totalBorrows,
    active: user.activeBorrows,
    returned: user.returnedBorrows,
  }));

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div className="w-full max-w-full space-y-4 overflow-x-hidden sm:space-y-6">
      {/* Key Metrics Cards — shared StatCard grid (Wave 4 rollout) */}
      <StatCardGrid>
        <StatCard
          title="Total Books"
          value={data.systemHealth?.totalBooks || 0}
          icon={BookOpen}
          hue="blue"
        />
        <StatCard
          title="Total Users"
          value={data.systemHealth?.totalUsers || 0}
          icon={Users}
          hue="emerald"
        />
        <StatCard
          title="Active Borrows"
          value={data.systemHealth?.activeBorrows || 0}
          icon={BookOpenCheck}
          hue="violet"
        />
        <StatCard
          title="Overdue Books"
          value={data.systemHealth?.overdueBooks || 0}
          icon={AlertTriangle}
          hue="amber"
        />
      </StatCardGrid>

      <section
        className="rounded-lg border bg-white p-4 shadow-sm sm:p-6"
        aria-labelledby="deterministic-insights"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="deterministic-insights"
              className="text-lg font-medium text-gray-900"
            >
              Explainable operational insights
            </h2>
            <p className="text-xs text-gray-500">
              Formula {data.deterministicInsights.formulaVersion} ·{" "}
              {data.deterministicInsights.periodStart} to{" "}
              {data.deterministicInsights.periodEnd}
            </p>
          </div>
          <span className="text-xs text-gray-500">
            Deterministic database aggregates; no external AI processing
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {[
            [
              "30-day circulation",
              data.deterministicInsights.circulation30Days,
            ],
            [
              "On-time returns",
              `${data.deterministicInsights.onTimeReturnRate}%`,
            ],
            ["Overdue ratio", `${data.deterministicInsights.overdueRatio}%`],
            [
              "Outstanding fines",
              `$${data.deterministicInsights.outstandingFineTotal.toFixed(2)}`,
            ],
            ["Demand / copy", data.deterministicInsights.demandToCopyRatio],
            ["Hold pressure", data.deterministicInsights.holdPressure],
            ["Renewal rate", `${data.deterministicInsights.renewalRate}%`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">{label}</dt>
              <dd className="mt-1 text-lg font-medium text-gray-900">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Borrowing Trends */}
        <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-medium sm:text-lg">
            Borrowing Trends
          </h3>
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={200} minWidth={300}>
              <LineChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="borrows"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Borrows"
                />
                <Line
                  type="monotone"
                  dataKey="returns"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Returns"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Books */}
        <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-medium sm:text-lg">
            Popular Books
          </h3>
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={200} minWidth={300}>
              <BarChart data={popularBooksData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="title"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={11}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="borrows" fill="#8884d8" name="Total Borrows" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Genre Distribution */}
        <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-medium sm:text-lg">
            Genre Distribution
          </h3>
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={200} minWidth={300}>
              <PieChart>
                <Pie
                  data={genresData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={50}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genresData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Activity */}
        <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-medium sm:text-lg">
            Top Users by Activity
          </h3>
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={200} minWidth={300}>
              <BarChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={11}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="borrows" fill="#8884d8" name="Total Borrows" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Overdue Books Table */}
      <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 text-base font-medium sm:text-lg">Overdue Books</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="min-w-[150px] whitespace-nowrap px-2 py-1.5 text-left text-xs sm:min-w-[200px] sm:px-4 sm:py-2 sm:text-sm">
                  Book
                </th>
                <th className="min-w-[150px] whitespace-nowrap px-2 py-1.5 text-left text-xs sm:min-w-[200px] sm:px-4 sm:py-2 sm:text-sm">
                  User
                </th>
                <th className="min-w-[120px] whitespace-nowrap px-2 py-1.5 text-left text-xs sm:min-w-[150px] sm:px-4 sm:py-2 sm:text-sm">
                  Days Overdue
                </th>
                <th className="min-w-[100px] whitespace-nowrap px-2 py-1.5 text-left text-xs sm:min-w-[120px] sm:px-4 sm:py-2 sm:text-sm">
                  Fine Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {data.overdueBooks.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-2 py-6 text-center text-gray-500 sm:px-4 sm:py-8"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className="text-3xl sm:text-3xl">✅</div>
                      <div className="text-base font-medium sm:text-lg">
                        No Overdue Books
                      </div>
                      <div className="text-xs sm:text-sm">
                        All books are returned on time!
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                data.overdueBooks.map((book) => (
                  <tr key={book.recordId} className="border-b">
                    <td className="min-w-[150px] whitespace-nowrap px-2 py-1.5 sm:min-w-[200px] sm:px-4 sm:py-2">
                      <div>
                        <div className="text-xs font-medium sm:text-sm">
                          {book.bookTitle}
                        </div>
                        <div className="text-xs text-gray-600 sm:text-sm">
                          {book.bookAuthor}
                        </div>
                      </div>
                    </td>
                    <td className="min-w-[150px] whitespace-nowrap px-2 py-1.5 sm:min-w-[200px] sm:px-4 sm:py-2">
                      <div>
                        <div className="text-xs font-medium sm:text-sm">
                          {book.userName}
                        </div>
                        <div className="text-xs text-gray-600 sm:text-sm">
                          {book.userEmail}
                        </div>
                      </div>
                    </td>
                    <td className="min-w-[120px] whitespace-nowrap px-2 py-1.5 sm:min-w-[150px] sm:px-4 sm:py-2">
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-800 sm:px-2 sm:py-1 sm:text-sm">
                        {book.daysOverdue} days
                      </span>
                    </td>
                    <td className="min-w-[100px] whitespace-nowrap px-2 py-1.5 sm:min-w-[120px] sm:px-4 sm:py-2">
                      {book.fineAmount ? (
                        <span className="text-xs font-medium text-red-600 sm:text-sm">
                          ${book.fineAmount}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 sm:text-sm">
                          No fine
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-medium sm:text-lg">
            Monthly Statistics
          </h3>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-gray-600 sm:text-sm">
                Current Month:
              </span>
              <span className="text-xs font-medium sm:text-sm">
                {data.monthlyStats?.currentMonth?.borrows || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-600 sm:text-sm">
                Last Month:
              </span>
              <span className="text-xs font-medium sm:text-sm">
                {data.monthlyStats?.lastMonth?.borrows || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-medium sm:text-lg">
            Overdue Analysis
          </h3>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-gray-600 sm:text-sm">
                Total Overdue:
              </span>
              <span className="text-xs font-medium sm:text-sm">
                {data.overdueStats?.totalOverdue || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-600 sm:text-sm">
                Avg Days Overdue:
              </span>
              <span className="text-xs font-medium sm:text-sm">
                {typeof data.overdueStats?.avgDaysOverdue === "number"
                  ? data.overdueStats.avgDaysOverdue.toFixed(1)
                  : 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-600 sm:text-sm">
                Total Fines:
              </span>
              <span className="text-xs font-medium text-red-600 sm:text-sm">
                ${data.overdueStats?.totalFines || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-600 sm:text-sm">
                Overdue Rate:
              </span>
              <span className="text-xs font-medium sm:text-sm">
                {data.systemHealth?.activeBorrows > 0
                  ? (
                      ((data.systemHealth?.overdueBooks || 0) /
                        data.systemHealth?.activeBorrows) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
