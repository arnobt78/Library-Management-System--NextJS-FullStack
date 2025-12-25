"use client";

import { usePerformanceStore } from "@/lib/stores/performance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PerformanceWrapper from "@/components/PerformanceWrapper";
import { Badge } from "@/components/ui/badge";

const PerformancePage = () => {
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
      if (time < 1000) return { grade: "A", color: "text-green-400" };
      if (time < 2000) return { grade: "B", color: "text-yellow-400" };
      if (time < 3000) return { grade: "C", color: "text-orange-400" };
      return { grade: "D", color: "text-red-400" };
    } else {
      if (time < 100) return { grade: "A", color: "text-green-400" };
      if (time < 300) return { grade: "B", color: "text-yellow-400" };
      if (time < 500) return { grade: "C", color: "text-orange-400" };
      return { grade: "D", color: "text-red-400" };
    }
  };

  const pageGrade = getPerformanceGrade(averagePageLoadTime, "page");
  const queryGrade = getPerformanceGrade(averageQueryTime, "query");

  // Get SSR-specific metrics
  const ssrMetrics = Object.entries(metrics.pageLoadTimes).filter(
    ([key]) =>
      key.includes("ssr-") ||
      key.includes("-hydration") ||
      key.includes("-visible")
  );

  return (
    <PerformanceWrapper pageName="performance">
      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="mb-2 text-2xl font-bold text-light-100 sm:text-3xl">
            Performance Dashboard
          </h1>
          <p className="text-sm text-light-200 sm:text-base">
            Monitor your application&apos;s performance metrics
          </p>
        </div>

        {/* Educational Section */}
        <Card className="mb-6 border-gray-700 bg-gray-800 sm:mb-8">
          <CardHeader>
            <CardTitle className="text-base text-light-100 sm:text-lg">
              📚 Performance Architecture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                  <Badge
                    variant="outline"
                    className="w-fit border-green-700 bg-green-900 text-xs text-green-300 sm:text-sm"
                  >
                    Current: SSR
                  </Badge>
                  <span className="text-xs font-medium text-light-200 sm:text-sm">
                    Server-Side Rendering
                  </span>
                </div>
                <p className="text-xs text-light-300 sm:text-sm">
                  ✅ Faster initial page loads
                  <br />
                  ✅ Better SEO
                  <br />
                  ✅ Reduced client-side JavaScript
                  <br />✅ Works without JavaScript
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                  <Badge
                    variant="outline"
                    className="w-fit border-blue-700 bg-blue-900 text-xs text-blue-300 sm:text-sm"
                  >
                    Alternative: CSR
                  </Badge>
                  <span className="text-xs font-medium text-light-200 sm:text-sm">
                    Client-Side Rendering
                  </span>
                </div>
                <p className="text-xs text-light-300 sm:text-sm">
                  ⚡ Rich caching with React Query
                  <br />
                  ⚡ Real-time data updates
                  <br />
                  ⚡ Better user interactions
                  <br />
                  ⚠️ Slower initial loads
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-gray-700 p-3 sm:mt-4 sm:p-4">
              <p className="text-xs text-light-200 sm:text-sm">
                <strong>Why Query Times Show 0:</strong> Your app uses SSR
                (Server-Side Rendering) which fetches data on the server before
                sending HTML to the browser. This is actually{" "}
                <strong>faster</strong> than client-side API calls, but
                doesn&apos;t trigger our client-side performance monitoring.
                Your terminal shows real server response times (200-400ms) which
                are excellent!
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {/* Page Load Time */}
          <Card className="border-gray-700 bg-gray-800">
            <CardHeader className="pb-1.5 sm:pb-2">
              <CardTitle className="text-xs font-medium text-light-100 sm:text-sm">
                Average Page Load Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-light-100 sm:text-2xl">
                  {averagePageLoadTime.toFixed(0)}ms
                </span>
                <span
                  className={`text-base font-bold sm:text-lg ${pageGrade.color}`}
                >
                  {pageGrade.grade}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Query Time */}
          <Card className="border-gray-700 bg-gray-800">
            <CardHeader className="pb-1.5 sm:pb-2">
              <CardTitle className="text-xs font-medium text-light-100 sm:text-sm">
                Average Query Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-light-100 sm:text-2xl">
                  {averageQueryTime.toFixed(0)}ms
                </span>
                <span
                  className={`text-base font-bold sm:text-lg ${queryGrade.color}`}
                >
                  {queryGrade.grade}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cache Hit Rate */}
          <Card className="border-gray-700 bg-gray-800">
            <CardHeader className="pb-1.5 sm:pb-2">
              <CardTitle className="text-xs font-medium text-light-100 sm:text-sm">
                Cache Hit Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-light-100 sm:text-2xl">
                  {cacheHitRate.toFixed(1)}%
                </span>
                <span
                  className={`text-base font-bold sm:text-lg ${
                    cacheHitRate > 80
                      ? "text-green-400"
                      : cacheHitRate > 60
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {cacheHitRate > 80 ? "A" : cacheHitRate > 60 ? "B" : "C"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Total Requests */}
          <Card className="border-gray-700 bg-gray-800">
            <CardHeader className="pb-1.5 sm:pb-2">
              <CardTitle className="text-xs font-medium text-light-100 sm:text-sm">
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-center sm:gap-0">
                <span className="text-xl font-bold text-light-100 sm:text-2xl">
                  {metrics.totalRequests}
                </span>
                <span className="text-xs text-light-200 sm:text-sm">
                  {metrics.cacheHits} hits, {metrics.cacheMisses} misses
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SSR Metrics */}
        {ssrMetrics.length > 0 && (
          <Card className="mb-4 border-gray-700 bg-gray-800 sm:mb-6">
            <CardHeader>
              <CardTitle className="text-base text-light-100 sm:text-lg">
                🚀 SSR Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 sm:space-y-2">
                {ssrMetrics.map(([metric, time]) => {
                  const grade = getPerformanceGrade(time, "page");
                  return (
                    <div
                      key={metric}
                      className="flex items-center justify-between"
                    >
                      <span className="font-mono text-xs text-light-200 sm:text-sm">
                        {metric.replace("ssr-", "").replace("-", " ")}
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Page Load Times */}
          <Card className="border-gray-700 bg-gray-800">
            <CardHeader>
              <CardTitle className="text-base text-light-100 sm:text-lg">
                Client-Side Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(metrics.pageLoadTimes).length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {Object.entries(metrics.pageLoadTimes)
                    .filter(
                      ([key]) =>
                        !key.includes("ssr-") &&
                        !key.includes("-hydration") &&
                        !key.includes("-visible")
                    )
                    .map(([page, time]) => {
                      const grade = getPerformanceGrade(time, "page");
                      return (
                        <div
                          key={page}
                          className="flex items-center justify-between"
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

          {/* Query Times */}
          <Card className="border-gray-700 bg-gray-800">
            <CardHeader>
              <CardTitle className="text-base text-light-100 sm:text-lg">
                Client-Side API Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(metrics.queryTimes).length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {Object.entries(metrics.queryTimes).map(([query, time]) => {
                    const grade = getPerformanceGrade(time, "query");
                    return (
                      <div
                        key={query}
                        className="flex items-center justify-between"
                      >
                        <span className="text-xs text-light-200 sm:text-sm">
                          {query}
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
                </div>
              ) : (
                <div className="space-y-1.5 sm:space-y-2">
                  <p className="text-xs text-light-200 sm:text-sm">
                    No client-side API calls detected
                  </p>
                  <div className="rounded bg-gray-700 p-2.5 text-xs text-light-300 sm:p-3 sm:text-sm">
                    <strong>Why?</strong> Your app uses Server-Side Rendering
                    (SSR) which fetches data on the server before sending HTML
                    to the browser. This is faster than client-side API calls
                    but doesn&apos;t show up in client-side monitoring.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reset Button */}
        <div className="mt-6 flex justify-center sm:mt-8">
          <Button
            onClick={resetMetrics}
            variant="outline"
            className="border-gray-700 bg-gray-800 text-xs text-light-100 hover:bg-gray-700 sm:text-sm"
          >
            Reset Metrics
          </Button>
        </div>
      </div>
    </PerformanceWrapper>
  );
};

export default PerformancePage;
