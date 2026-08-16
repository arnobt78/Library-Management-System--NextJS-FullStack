"use client";

/**
 * AnalyticsCharts — Business Insights ops dashboard.
 * SSR snapshot + RQ staleTime 0 / always remount refetch (no invent densify series).
 * 8 KPIs · shared opsPeriod · 8 charts · overdue DataTable · cross-domain chips.
 */

import React, { useMemo, useState } from "react";
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
import type { AnalyticsData, OverdueBook } from "@/lib/services/analytics";
import ChartSkeleton from "@/components/skeletons/ChartSkeleton";
import GenericCardSkeleton from "@/components/skeletons/GenericCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { FilterSelect } from "@/components/ui/filter-select";
import { ADMIN_PANEL_CLASS } from "@/lib/ui/adminSurfaceStyles";
import { AdminDetailEmptyState } from "@/components/admin/AdminDetailEmptyState";
import { InsightsOverdueTable } from "@/components/admin/InsightsOverdueTable";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import PrefetchLink from "@/components/PrefetchLink";
import {
  insightsOpsPeriodMonthCount,
  insightsOpsPeriodOptions,
  insightsOpsPeriodToDays,
  matchesOverdueOpsDaysPeriod,
  type InsightsOpsPeriod,
} from "@/lib/ui/periodFilterOptions";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookMarked,
  ClipboardList,
  Clock,
  DollarSign,
  FileWarning,
  Inbox,
  MessageSquareWarning,
  Percent,
  PieChart as PieChartIcon,
  Star,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";

interface AnalyticsChartsProps {
  initialData?: AnalyticsData;
}

const OPS_PERIOD_OPTIONS = insightsOpsPeriodOptions("light");
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const CHIP_CLASS =
  "rounded-full border px-3 py-1 text-xs font-medium transition-colors";

function filterOverdueByOpsPeriod(
  rows: OverdueBook[],
  period: InsightsOpsPeriod,
): OverdueBook[] {
  return rows.filter((r) =>
    matchesOverdueOpsDaysPeriod(r.daysOverdue, period),
  );
}

function overdueAnalysisFromRows(
  rows: OverdueBook[],
  activeBorrows: number,
): {
  totalOverdue: number;
  avgDaysOverdue: number;
  totalFines: number;
  overdueRate: number;
} {
  const totalOverdue = rows.length;
  const totalFines = rows.reduce((sum, r) => sum + (Number(r.fineAmount) || 0), 0);
  const avgDaysOverdue =
    totalOverdue === 0
      ? 0
      : rows.reduce((sum, r) => sum + (Number(r.daysOverdue) || 0), 0) /
        totalOverdue;
  const overdueRate =
    activeBorrows > 0 ? (totalOverdue / activeBorrows) * 100 : 0;
  return { totalOverdue, avgDaysOverdue, totalFines, overdueRate };
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ initialData }) => {
  const [opsPeriod, setOpsPeriod] = useState<InsightsOpsPeriod>("30days");
  const trendsDays = insightsOpsPeriodToDays(opsPeriod);

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    isError: analyticsError,
    error: analyticsErrorData,
  } = useBusinessInsights(
    {
      popularBooksLimit: 10,
      borrowingTrendsDays: trendsDays,
    },
    initialData,
  );

  const data: AnalyticsData | undefined = analyticsData ?? initialData;

  const periodOverdue = useMemo(
    () => filterOverdueByOpsPeriod(data?.overdueBooks ?? [], opsPeriod),
    [data?.overdueBooks, opsPeriod],
  );

  const periodOverdueStats = useMemo(
    () =>
      overdueAnalysisFromRows(
        periodOverdue,
        data?.systemHealth?.activeBorrows ?? 0,
      ),
    [periodOverdue, data?.systemHealth?.activeBorrows],
  );

  const monthlySeries = useMemo(() => {
    const months = data?.monthlyStats?.months ?? [];
    const n = insightsOpsPeriodMonthCount(opsPeriod);
    return months.slice(-n).map((m) => ({
      month: m.month,
      label: new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      borrows: m.borrows,
    }));
  }, [data?.monthlyStats?.months, opsPeriod]);

  if (analyticsLoading && !initialData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <GenericCardSkeleton
              key={`metric-skeleton-${i}`}
              showHeader={false}
              showFooter={false}
              contentLines={2}
              lineHeight={4}
              useCardWrapper={false}
              className={ADMIN_PANEL_CLASS}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {[...Array(8)].map((_, i) => (
            <div key={`chart-skeleton-${i}`} className={ADMIN_PANEL_CLASS}>
              <Skeleton className="mb-4 h-7 w-40" />
              <ChartSkeleton
                variant={i === 3 ? "pie" : i % 2 === 0 ? "line" : "bar"}
                height={300}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

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

  const health = data.systemHealth;
  const insights = data.deterministicInsights;

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
  }));

  const genresData = data.popularGenres.map((genre) => ({
    name: genre.genre,
    value: genre.totalBorrows,
  }));

  const userActivityData = data.userActivity.slice(0, 10).map((user) => ({
    name:
      user.userName.length > 15
        ? user.userName.substring(0, 15) + "..."
        : user.userName,
    borrows: user.totalBorrows,
  }));

  const fineForecastData = [
    {
      name: "Outstanding",
      amount: insights.fineForecast.outstanding,
    },
    {
      name: `Projected (+${insights.fineForecast.horizonDays}d)`,
      amount: insights.fineForecast.projectedAccrual,
    },
  ];

  const genrePressureData = insights.genreDemandPressure.slice(0, 8).map((g) => ({
    genre: g.genre.length > 14 ? `${g.genre.slice(0, 14)}…` : g.genre,
    pressure: g.pressure,
    borrows: g.borrows,
  }));

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Trends and analysis window · charts refetch on change (no densify invent)
        </p>
        <FilterSelect
          label="Ops period"
          variant="light"
          labelLayout="embedded"
          value={opsPeriod}
          onValueChange={(v) => setOpsPeriod(v as InsightsOpsPeriod)}
          options={OPS_PERIOD_OPTIONS}
          className="w-full sm:w-48"
        />
      </div>

      <StatCardGrid className="lg:grid-cols-4">
        <StatCard
          title="Overdue Now"
          value={health.overdueBooks}
          icon={AlertTriangle}
          hue="rose"
          badges={
            periodOverdueStats.totalOverdue !== health.overdueBooks
              ? [
                  {
                    label: `${periodOverdueStats.totalOverdue} In Window`,
                    hue: "amber",
                  },
                ]
              : undefined
          }
        />
        <StatCard
          title="Due ≤48h"
          value={health.dueSoon48h}
          icon={Clock}
          hue="amber"
        />
        <StatCard
          title="Fines Outstanding"
          value={`$${insights.outstandingFineTotal.toFixed(2)}`}
          icon={DollarSign}
          hue="rose"
          badges={
            Math.abs(
              insights.fineForecast.total - insights.outstandingFineTotal,
            ) > 0.009
              ? [
                  {
                    label: `Forecast $${insights.fineForecast.total.toFixed(0)}`,
                    hue: "amber",
                  },
                ]
              : undefined
          }
        />
        <StatCard
          title="Pending Borrow Queue"
          value={health.pendingRequests}
          icon={Inbox}
          hue="violet"
        />
        <StatCard
          title="Holds Waiting"
          value={health.holdsWaiting}
          icon={BookMarked}
          hue="blue"
        />
        <StatCard
          title="On-Time Returns"
          value={`${insights.onTimeReturnRate}%`}
          icon={Percent}
          hue="emerald"
        />
        <StatCard
          title="Open Tickets"
          value={health.openTickets}
          icon={Ticket}
          hue="amber"
        />
        <StatCard
          title="Pending Reviews"
          value={health.pendingReviews}
          icon={Star}
          hue="violet"
        />
      </StatCardGrid>

      <section
        className={ADMIN_PANEL_CLASS}
        aria-labelledby="deterministic-insights"
      >
        <TicketSectionHeader
          className="mb-0"
          align="center"
          icon={<Activity className="size-5" />}
          title="Explainable Operational Insights"
          subtitle={`Formula ${insights.formulaVersion} · ${insights.periodStart} to ${insights.periodEnd}`}
          iconToneClassName="border-sky-200 bg-sky-50 text-sky-600"
          trailing={
            <span className="text-xs text-gray-500">
              Deterministic aggregates · advisory forecast only
            </span>
          }
        />
        {insights.circulation30Days === 0 ? (
          <p className="mt-2 text-xs text-gray-500">
            No borrowing activity in this period yet — ratios stay at zero until
            circulation starts.
          </p>
        ) : null}
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {[
            ["30-day circulation", insights.circulation30Days],
            ["On-time returns", `${insights.onTimeReturnRate}%`],
            ["Overdue ratio", `${insights.overdueRatio}%`],
            [
              "Outstanding fines",
              `$${insights.outstandingFineTotal.toFixed(2)}`,
            ],
            [
              `${insights.fineForecast.horizonDays}-day fine forecast`,
              `$${insights.fineForecast.total.toFixed(2)}`,
            ],
            ["Demand / copy", insights.demandToCopyRatio],
            ["Hold pressure", insights.holdPressure],
            ["Renewal rate", `${insights.renewalRate}%`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">{label}</dt>
              <dd className="mt-1 text-lg font-medium text-gray-900">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-gray-500">
          Fine forecast is advisory ($
          {insights.fineForecast.projectedAccrual.toFixed(2)} projected accrual
          over {insights.fineForecast.horizonDays} days at $
          {insights.fineForecast.dailyRate}/day) — does not mutate fines.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <PrefetchLink
          href="/admin/book-requests"
          prefetchKind="admin-book-requests"
          className={`${CHIP_CLASS} border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100`}
        >
          Borrow Queue
        </PrefetchLink>
        <PrefetchLink
          href="/admin/account-requests"
          prefetchKind="admin-account-requests"
          className={`${CHIP_CLASS} border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100`}
        >
          Registration Queue
        </PrefetchLink>
        <PrefetchLink
          href="/admin/book-reviews"
          prefetchKind="admin-reviews"
          className={`${CHIP_CLASS} border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 hover:bg-fuchsia-100`}
        >
          Book Reviews
        </PrefetchLink>
        <PrefetchLink
          href="/admin/support-tickets"
          prefetchKind="admin-tickets"
          className={`${CHIP_CLASS} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100`}
        >
          Support Tickets
        </PrefetchLink>
        <PrefetchLink
          href="/admin/admin-requests"
          prefetchKind="admin-admin-requests"
          className={`${CHIP_CLASS} border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100`}
        >
          Admin Requests
        </PrefetchLink>
        <PrefetchLink
          href="/admin/automation"
          className={`${CHIP_CLASS} border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100`}
        >
          Automation
        </PrefetchLink>
        <PrefetchLink
          href="/admin/books?availability=low"
          prefetchKind="admin-books"
          className={`${CHIP_CLASS} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100`}
        >
          Low Stock
        </PrefetchLink>
        <PrefetchLink
          href="/admin/books?availability=unavailable"
          prefetchKind="admin-books"
          className={`${CHIP_CLASS} border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100`}
        >
          Out Of Stock
        </PrefetchLink>
        <PrefetchLink
          href="/admin/books"
          prefetchKind="admin-books"
          className={`${CHIP_CLASS} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
        >
          Featured / Catalog
        </PrefetchLink>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className={ADMIN_PANEL_CLASS}>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<TrendingUp className="size-5" />}
            title="Borrowing Trends"
            subtitle={`Daily borrows and returns · last ${trendsDays} days`}
            iconToneClassName="border-indigo-200 bg-indigo-50 text-indigo-600"
          />
          {trendsData.length === 0 ? (
            <AdminDetailEmptyState
              className="min-h-[200px]"
              message="No borrowing activity yet — trends appear after borrow requests."
            />
          ) : (
            <div className="mt-4 w-full overflow-x-auto">
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
          )}
        </div>

        <div className={ADMIN_PANEL_CLASS}>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<AlertTriangle className="size-5" />}
            title="Overdue Trend (14 days)"
            subtitle="Loans past due and still out at end of each day"
            iconToneClassName="border-rose-200 bg-rose-50 text-rose-600"
          />
          {insights.overdueTrend.every((p) => p.overdueCount === 0) ? (
            <AdminDetailEmptyState
              className="min-h-[200px]"
              message="No overdue loans in the last 14 days."
            />
          ) : (
            <div className="mt-4 w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={200} minWidth={300}>
                <LineChart data={insights.overdueTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="overdueCount"
                    stroke="#e11d48"
                    strokeWidth={2}
                    name="Overdue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className={ADMIN_PANEL_CLASS}>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<BarChart3 className="size-5" />}
            title="Popular Books"
            subtitle="Most borrowed titles (not catalog rating)"
            iconToneClassName="border-violet-200 bg-violet-50 text-violet-600"
          />
          {popularBooksData.length === 0 ? (
            <AdminDetailEmptyState
              className="min-h-[200px]"
              message="No borrowing activity yet — popular books appear after loans."
            />
          ) : (
            <div className="mt-4 w-full overflow-x-auto">
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
          )}
        </div>

        <div className={ADMIN_PANEL_CLASS}>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<PieChartIcon className="size-5" />}
            title="Popular Genres (by borrows)"
            subtitle="Borrow-weighted mix"
            iconToneClassName="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-600"
          />
          {genresData.length === 0 ? (
            <AdminDetailEmptyState
              className="min-h-[200px]"
              message="No borrowing activity yet — genre popularity appears after loans."
            />
          ) : (
            <div className="mt-4 w-full overflow-x-auto">
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
                    {genresData.map((_, index) => (
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
          )}
        </div>

        <div className={ADMIN_PANEL_CLASS}>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<Users className="size-5" />}
            title="Top Users by Activity"
            subtitle="Borrowers ranked by total loans"
            iconToneClassName="border-cyan-200 bg-cyan-50 text-cyan-600"
          />
          {userActivityData.length === 0 ? (
            <AdminDetailEmptyState
              className="min-h-[200px]"
              message="No borrowing activity yet — top users appear after loans."
            />
          ) : (
            <div className="mt-4 w-full overflow-x-auto">
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
          )}
        </div>

        <div className={ADMIN_PANEL_CLASS}>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<DollarSign className="size-5" />}
            title="Fine Forecast"
            subtitle={`Outstanding vs projected accrual · ${insights.fineForecast.horizonDays}-day horizon`}
            iconToneClassName="border-amber-200 bg-amber-50 text-amber-600"
          />
          {insights.fineForecast.outstanding === 0 &&
          insights.fineForecast.projectedAccrual === 0 ? (
            <AdminDetailEmptyState
              className="min-h-[200px]"
              message="No outstanding or projected fines."
            />
          ) : (
            <div className="mt-4 w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={200} minWidth={300}>
                <BarChart data={fineForecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [
                      `$${Number(value ?? 0).toFixed(2)}`,
                      "Amount",
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="amount" fill="#f59e0b" name="USD" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className={ADMIN_PANEL_CLASS}>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<ClipboardList className="size-5" />}
            title="Genre Demand Pressure"
            subtitle="Borrows ÷ copies (deterministic)"
            iconToneClassName="border-rose-200 bg-rose-50 text-rose-600"
          />
          {genrePressureData.length === 0 ? (
            <AdminDetailEmptyState
              className="min-h-[200px]"
              message="No genre pressure yet — appears after circulation."
            />
          ) : (
            <div className="mt-4 w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={200} minWidth={300}>
                <BarChart data={genrePressureData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="genre"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={11}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pressure" fill="#e11d48" name="Pressure" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className={ADMIN_PANEL_CLASS}>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<BarChart3 className="size-5" />}
            title="Monthly Borrows"
            subtitle={`Trailing ${monthlySeries.length} month${monthlySeries.length === 1 ? "" : "s"} from 12-month series`}
            iconToneClassName="border-slate-200 bg-slate-50 text-slate-600"
          />
          {monthlySeries.every((m) => m.borrows === 0) ? (
            <AdminDetailEmptyState
              className="min-h-[200px]"
              message="No monthly borrow volume in this window."
            />
          ) : (
            <div className="mt-4 w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={200} minWidth={300}>
                <BarChart data={monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="borrows" fill="#6366f1" name="Borrows" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <InsightsOverdueTable rows={data.overdueBooks} />

      <div className={ADMIN_PANEL_CLASS}>
        <TicketSectionHeader
          className="mb-0"
          align="center"
          icon={<FileWarning className="size-5" />}
          title="Overdue Analysis"
          subtitle={`Volume, fines, rate for ops window · advisory ${insights.fineForecast.horizonDays}-day fine forecast`}
          iconToneClassName="border-rose-200 bg-rose-50 text-rose-600"
          trailing={
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <MessageSquareWarning className="size-3.5" aria-hidden />
              Period-filtered
            </span>
          }
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Total overdue</p>
            <p className="mt-1 text-lg font-medium tabular-nums">
              {periodOverdueStats.totalOverdue}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Avg days overdue</p>
            <p className="mt-1 text-lg font-medium tabular-nums">
              {periodOverdueStats.avgDaysOverdue.toFixed(1)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Total fines</p>
            <p className="mt-1 text-lg font-medium tabular-nums text-rose-600">
              ${periodOverdueStats.totalFines.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Overdue rate</p>
            <p className="mt-1 text-lg font-medium tabular-nums">
              {periodOverdueStats.overdueRate.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg bg-amber-50/80 p-3 sm:col-span-2 lg:col-span-1">
            <p className="text-xs text-amber-800">
              {insights.fineForecast.horizonDays}-day forecast total
            </p>
            <p className="mt-1 text-lg font-medium tabular-nums text-amber-800">
              ${insights.fineForecast.total.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
