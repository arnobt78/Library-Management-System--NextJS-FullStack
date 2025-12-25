/**
 * API Status Page
 *
 * Server Component that fetches service health and system metrics server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 */

import React from "react";
import Header from "@/components/Header";
import { auth } from "@/auth";
import ApiStatusClient from "@/components/ApiStatusClient";
import type { ServiceStatus } from "@/lib/services/health-monitor";
import type { MetricsData } from "@/lib/services/metrics-monitor";

export const runtime = "nodejs";

const ApiStatusPage = async () => {
  const session = await auth();

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
              Authentication Required
            </p>
            <p className="text-xs text-gray-500 sm:text-sm">
              Please sign in to view API status.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch all data server-side for SSR
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://university-library-managment.vercel.app"
      : "http://localhost:3000";

  let initialServices: ServiceStatus[] | undefined;
  let initialMetrics: MetricsData | undefined;

  try {
    // Fetch service health and system metrics in parallel
    const services = [
      "api-server",
      "database",
      "file-storage",
      "authentication",
      "email-service",
      "external-apis",
    ];

    const [healthChecks, metricsResponse] = await Promise.allSettled([
      // Fetch all services health checks
      Promise.allSettled(
        services.map((service) =>
          fetch(`${baseUrl}/api/status/${service}`, {
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then((res) => res.json())
            .catch(() => ({
              status: "DOWN",
              responseTime: "0ms",
              endpoint: service,
              performance: "Poor",
              performanceValue: 0,
              error: "Failed to fetch",
              timestamp: new Date().toISOString(),
            }))
        )
      ),
      // Fetch system metrics
      fetch(`${baseUrl}/api/status/metrics`, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      }).then((res) => res.json()),
    ]);

    // Process service health data
    if (healthChecks.status === "fulfilled") {
      const serviceNames = [
        "API Server",
        "Database",
        "File Storage",
        "Authentication",
        "Email Service",
        "External APIs",
      ];

      initialServices = healthChecks.value.map((result, index) => {
        const service = services[index];
        const healthData =
          result.status === "fulfilled"
            ? result.value
            : {
                status: "DOWN" as const,
                responseTime: "0ms",
                endpoint: service,
                performance: "Poor" as const,
                performanceValue: 0,
                error: "Failed to fetch",
                timestamp: new Date().toISOString(),
              };

        return {
          name: serviceNames[index],
          status: healthData.status,
          responseTime: parseInt(
            (healthData.responseTime || "0ms").replace("ms", "")
          ),
          endpoint: healthData.endpoint || service,
          description: `${serviceNames[index]} health check`,
          icon: null,
          performance: healthData.performance || "Poor",
          performanceValue: healthData.performanceValue || 0,
          details: healthData.details,
          lastChecked: healthData.timestamp || new Date().toISOString(),
        };
      });
    }

    // Process system metrics data
    if (
      metricsResponse.status === "fulfilled" &&
      metricsResponse.value.metrics
    ) {
      initialMetrics = metricsResponse.value.metrics;
    }
  } catch (error) {
    // If SSR fetch fails, let client-side fetch handle it
    console.error("Failed to fetch initial data for API status:", error);
  }

  return (
    <main className="root-container">
      <div className="mx-auto w-full">
        <Header session={session} />

        <div className="py-0">
          <div className="min-h-screen bg-transparent py-0">
            <div className="mx-auto max-w-7xl px-3 sm:px-4">
              <ApiStatusClient
                initialServices={initialServices}
                initialMetrics={initialMetrics}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ApiStatusPage;
