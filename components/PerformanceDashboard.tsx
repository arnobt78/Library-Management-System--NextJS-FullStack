"use client";

/**
 * Client/Zustand performance metrics (embedded on /api-status).
 * Glass sections + Lucide (no emoji titles); Reset Metrics → showToast.status.metricsReset.
 */

import { usePerformanceStore } from "@/lib/stores/performance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PerformanceWrapper from "@/components/PerformanceWrapper";
import { Badge } from "@/components/ui/badge";
import GlassSectionHeader from "@/components/GlassSectionHeader";
import { showToast } from "@/lib/toast";
import {
  AlertTriangle,
  BarChart3,
  Check,
  Gauge,
  Layers,
  RotateCcw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GLASS_CARD =
  "border-white/10 bg-dark-300/60 text-light-100 shadow-[0_12px_28px_rgba(0,0,0,0.25)] backdrop-blur-sm";
const GLASS_TILE =
  "rounded-xl border border-white/10 bg-dark-300/40 p-3 shadow-sm backdrop-blur-sm sm:p-4";

type PerformanceDashboardProps = {
  /** When true (API Status embed), use section heading instead of page H1 */
  embedded?: boolean;
};

const PerformanceDashboard = ({
  embedded = false,
}: PerformanceDashboardProps) => {
  const { metrics, resetMetrics } = usePerformanceStore();

  const averagePageLoadTime =
    Object.values(metrics.pageLoadTimes).length > 0
      ? Object.values(metrics.pageLoadTimes).reduce((a, b) => a + b, 0) /
        Object.values(metrics.pageLoadTimes).length
      : 0;

  const averageQueryTime =
    Object.values(metrics.queryTimes).length > 0
      ? Object.values(metrics.queryTimes).reduce((a, b) => a + b, 0) /
        Object.values(metrics.queryTimes).length
      : 0;

  const cacheHitRate =
    metrics.totalRequests > 0
      ? (metrics.cacheHits / metrics.totalRequests) * 100
      : 0;

  const getPerformanceGrade = (time: number, type: "page" | "query") => {
    if (type === "page") {
      if (time < 1000) return { grade: "A", color: "text-emerald-400" };
      if (time < 2000) return { grade: "B", color: "text-yellow-400" };
      if (time < 3000) return { grade: "C", color: "text-orange-400" };
      return { grade: "D", color: "text-red-400" };
    }
    if (time < 100) return { grade: "A", color: "text-emerald-400" };
    if (time < 300) return { grade: "B", color: "text-yellow-400" };
    if (time < 500) return { grade: "C", color: "text-orange-400" };
    return { grade: "D", color: "text-red-400" };
  };

  const pageGrade = getPerformanceGrade(averagePageLoadTime, "page");
  const queryGrade = getPerformanceGrade(averageQueryTime, "query");

  const ssrMetrics = Object.entries(metrics.pageLoadTimes).filter(
    ([key]) =>
      key.includes("ssr-") ||
      key.includes("-hydration") ||
      key.includes("-visible"),
  );

  const handleReset = () => {
    resetMetrics();
    showToast.status.metricsReset();
  };

  return (
    <PerformanceWrapper pageName="performance">
      <div className="w-full space-y-4 sm:space-y-6">
        <div className="mb-0">
          {embedded ? (
            <>
              <h2 className="text-xl font-medium text-light-100 sm:text-3xl">
                Client Performance
              </h2>
              <p className="text-sm text-light-200 sm:text-base">
                Browser-collected metrics (page load, queries, cache) — separate
                from server health above.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-medium text-light-100 sm:text-3xl">
                Performance Dashboard
              </h1>
              <p className="text-sm text-light-200 sm:text-base">
                Monitor your application&apos;s performance metrics
              </p>
            </>
          )}
        </div>

        <section className="space-y-3 sm:space-y-4">
          <GlassSectionHeader
            icon={<Layers className="size-5 text-primary" />}
            title="Performance Architecture"
            subtitle="SSR delivers HTML first; React Query hydrates interactive data"
          />
          <Card className={GLASS_CARD}>
            <CardContent className="space-y-3 p-2 sm:space-y-4 sm:p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className={cn(GLASS_TILE, "space-y-2")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="glassReturned">Current: SSR</Badge>
                    <span className="text-xs font-medium text-light-200 sm:text-sm">
                      Server-Side Rendering
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-light-200 sm:text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 shrink-0 text-emerald-400" />
                      Faster initial page loads
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 shrink-0 text-emerald-400" />
                      Better SEO
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 shrink-0 text-emerald-400" />
                      Reduced client-side JavaScript
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 shrink-0 text-emerald-400" />
                      Works without JavaScript
                    </li>
                  </ul>
                </div>
                <div className={cn(GLASS_TILE, "space-y-2")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="glassPending">Alternative: CSR</Badge>
                    <span className="text-xs font-medium text-light-200 sm:text-sm">
                      Client-Side Rendering
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-light-200 sm:text-sm">
                    <li className="flex items-start gap-2">
                      <Zap className="size-3.5 shrink-0 text-amber-400" />
                      Rich caching with React Query
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap className="size-3.5 shrink-0 text-amber-400" />
                      Real-time data updates
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap className="size-3.5 shrink-0 text-amber-400" />
                      Better user interactions
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="size-3.5 shrink-0 text-orange-400" />
                      Slower initial loads
                    </li>
                  </ul>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-dark-300/50 p-3 sm:p-4">
                <p className="text-xs text-light-200 sm:text-sm">
                  <strong className="text-light-100">
                    Why query times may show 0:
                  </strong>{" "}
                  SSR fetches on the server before HTML reaches the browser, so
                  many loads never hit client-side API monitoring. Terminal
                  server timings (often 200–400ms) remain the source of truth
                  for those requests.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3 sm:space-y-4">
          <GlassSectionHeader
            icon={<Gauge className="size-5 text-primary" />}
            title="Session Snapshot"
            subtitle="Averages from this browser session"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <div className={GLASS_TILE}>
              <p className="text-xs font-medium text-light-200 sm:text-sm">
                Average Page Load Time
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xl font-medium text-light-100">
                  {averagePageLoadTime.toFixed(0)}ms
                </span>
                <span
                  className={`text-base font-medium sm:text-lg ${pageGrade.color}`}
                >
                  {pageGrade.grade}
                </span>
              </div>
            </div>
            <div className={GLASS_TILE}>
              <p className="text-xs font-medium text-light-200 sm:text-sm">
                Average Query Time
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xl font-medium text-light-100">
                  {averageQueryTime.toFixed(0)}ms
                </span>
                <span
                  className={`text-base font-medium sm:text-lg ${queryGrade.color}`}
                >
                  {queryGrade.grade}
                </span>
              </div>
            </div>
            <div className={GLASS_TILE}>
              <p className="text-xs font-medium text-light-200 sm:text-sm">
                Cache Hit Rate
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xl font-medium text-light-100">
                  {cacheHitRate.toFixed(1)}%
                </span>
                <span
                  className={`text-base font-medium sm:text-lg ${
                    cacheHitRate > 80
                      ? "text-emerald-400"
                      : cacheHitRate > 60
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {cacheHitRate > 80 ? "A" : cacheHitRate > 60 ? "B" : "C"}
                </span>
              </div>
            </div>
            <div className={GLASS_TILE}>
              <p className="text-xs font-medium text-light-200 sm:text-sm">
                Total Requests
              </p>
              <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xl font-medium text-light-100">
                  {metrics.totalRequests}
                </span>
                <span className="text-xs text-light-200 sm:text-sm">
                  {metrics.cacheHits} hits, {metrics.cacheMisses} misses
                </span>
              </div>
            </div>
          </div>
        </section>

        {ssrMetrics.length > 0 && (
          <section className="space-y-3 sm:space-y-4">
            <GlassSectionHeader
              icon={<BarChart3 className="size-5 text-primary" />}
              title="SSR Performance Metrics"
              subtitle="Hydration and paint timings captured in-browser"
            />
            <Card className={GLASS_CARD}>
              <CardContent className="space-y-1.5 p-2 sm:space-y-2 sm:p-4">
                {ssrMetrics.map(([metric, time]) => {
                  const grade = getPerformanceGrade(time, "page");
                  return (
                    <div
                      key={metric}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="font-mono text-xs text-light-200 sm:text-sm">
                        {metric.replace("ssr-", "").replace(/-/g, " ")}
                      </span>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-xs text-light-100 sm:text-sm">
                          {time.toFixed(0)}ms
                        </span>
                        <span className={`text-xs sm:text-sm ${grade.color}`}>
                          {grade.grade}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </section>
        )}

        <section className="space-y-3 sm:space-y-4">
          <GlassSectionHeader
            icon={<Zap className="size-5 text-primary" />}
            title="Client Detail"
            subtitle="Per-page and per-query timings from this session"
          />
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
            <Card className={GLASS_CARD}>
              <CardContent className="p-2 sm:p-4">
                <p className="mb-3 text-sm font-medium text-light-100">
                  Client-Side Metrics
                </p>
                {Object.keys(metrics.pageLoadTimes).length > 0 ? (
                  <div className="space-y-1.5 sm:space-y-2">
                    {Object.entries(metrics.pageLoadTimes)
                      .filter(
                        ([key]) =>
                          !key.includes("ssr-") &&
                          !key.includes("-hydration") &&
                          !key.includes("-visible"),
                      )
                      .map(([page, time]) => {
                        const grade = getPerformanceGrade(time, "page");
                        return (
                          <div
                            key={page}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-xs capitalize text-light-200 sm:text-sm">
                              {page}
                            </span>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="text-xs text-light-100 sm:text-sm">
                                {time.toFixed(0)}ms
                              </span>
                              <span
                                className={`text-xs sm:text-sm ${grade.color}`}
                              >
                                {grade.grade}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-xs text-light-200 sm:text-sm">
                    No client-side metrics available
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className={GLASS_CARD}>
              <CardContent className="p-2 sm:p-4">
                <p className="mb-3 text-sm font-medium text-light-100">
                  Client-Side API Calls
                </p>
                {Object.keys(metrics.queryTimes).length > 0 ? (
                  <div className="space-y-1.5 sm:space-y-2">
                    {Object.entries(metrics.queryTimes).map(([query, time]) => {
                      const grade = getPerformanceGrade(time, "query");
                      return (
                        <div
                          key={query}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate text-xs text-light-200 sm:text-sm">
                            {query}
                          </span>
                          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                            <span className="text-xs text-light-100 sm:text-sm">
                              {time.toFixed(0)}ms
                            </span>
                            <span
                              className={`text-xs sm:text-sm ${grade.color}`}
                            >
                              {grade.grade}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-light-200 sm:text-sm">
                      No client-side API calls detected
                    </p>
                    <div className="rounded-lg border border-white/10 bg-dark-300/50 p-2.5 text-xs text-light-200 sm:p-3 sm:text-sm">
                      <strong className="text-light-100">Why?</strong> SSR often
                      fetches on the server before HTML reaches the browser, so
                      those calls do not appear here.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="flex justify-center">
          <Button
            onClick={handleReset}
            variant="outline"
            className="gap-2 border-white/15 bg-dark-300/50 text-xs text-light-100 transition-colors hover:border-white/25 hover:bg-dark-300/80 hover:text-light-200 sm:text-sm [&_svg]:transition-colors"
          >
            <RotateCcw className="size-3.5 sm:size-4" />
            Reset Metrics
          </Button>
        </div>
      </div>
    </PerformanceWrapper>
  );
};

export default PerformanceDashboard;
