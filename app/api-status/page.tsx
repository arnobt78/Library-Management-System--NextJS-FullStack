/**
 * API Status Page
 *
 * Server Component that fetches service health and system metrics server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 */

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { auth } from "@/auth";
import ApiStatusClient from "@/components/ApiStatusClient";
import type { ServiceStatus } from "@/lib/services/health-monitor";
import type { MetricsData } from "@/lib/services/metrics-monitor";
import { requireAdminActor } from "@/lib/auth/authorization";
import { headers } from "next/headers";

export const runtime = "nodejs";

const ApiStatusPage = async () => {
  const session = await auth();

  if (!session) {
    return (
      <main className="root-container">
        <div className="page-shell flex min-h-screen flex-col">
          <div className="page-shell-main empty-panel flex-1">
            <p className="mb-2 text-base font-medium text-red-400 sm:text-lg">
              Authentication Required
            </p>
            <p className="text-xs text-light-100/70 sm:text-sm">
              Please sign in to view API status.
            </p>
          </div>
          <Footer />
        </div>
      </main>
    );
  }

  let isAdmin = false;
  try {
    await requireAdminActor();
    isAdmin = true;
  } catch {
    // Operator diagnostics are deliberately unavailable to ordinary users.
  }
  // Fetch public liveness for members and richer diagnostics for operators.
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  const cookie = requestHeaders.get("cookie") ?? "";

  let initialServices: ServiceStatus[] | undefined;
  let initialMetrics: MetricsData | undefined;

  try {
    if (!isAdmin) {
      const healthResponse = await fetch(`${baseUrl}/api/status/health`, {
        cache: "no-store",
      });
      const health = (await healthResponse.json()) as {
        status: "HEALTHY" | "DEGRADED" | "DOWN";
        timestamp: string;
      };
      initialServices = [
        {
          name: "Application",
          status: health.status,
          responseTime: 0,
          endpoint: "/api/status/health",
          description: "Public application liveness",
          icon: null,
          performance: health.status === "HEALTHY" ? "Excellent" : "Poor",
          performanceValue: health.status === "HEALTHY" ? 100 : 0,
          lastChecked: health.timestamp,
        },
      ];
    } else {
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
                cookie,
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
              })),
          ),
        ),
        // Fetch system metrics
        fetch(`${baseUrl}/api/status/metrics`, {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            cookie,
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
              (healthData.responseTime || "0ms").replace("ms", ""),
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
    }
  } catch {
    // If SSR fetch fails, let client-side fetch handle it
  }

  return (
    <main className="root-container">
      <div className="page-shell flex min-h-screen flex-col">
        <Header session={session} />
        <div className="page-shell-main flex-1 space-y-4 sm:space-y-6">
          <ApiStatusClient
            initialServices={initialServices}
            initialMetrics={initialMetrics}
            operatorMode={isAdmin}
          />
        </div>
        <Footer />
      </div>
    </main>
  );
};

export default ApiStatusPage;
