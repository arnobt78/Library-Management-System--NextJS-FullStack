import React from "react";

export interface SystemMetric {
  title: string;
  value: string;
  status: "good" | "warning" | "critical";
  icon: React.ReactNode;
  description: string;
  details?: Record<string, unknown> | unknown;
}

export interface MetricsData {
  databasePerformance: {
    active: number;
    max: number;
    activeQueries: number;
    status: "good" | "warning" | "critical";
    description: string;
  };
  apiPerformance: {
    requestsPerMinute: number;
    status: "UP" | "DOWN" | "DEGRADED" | string;
  };
  errorRate: {
    rate: string;
    status: "good" | "warning" | "critical";
    description: string;
    totalRequests: number;
    recentRequests: number;
  };
  storageUsage: {
    used: string;
    total: string;
    percentage: number;
    status: "good" | "warning" | "critical";
    description: string;
    tableCount: number;
  };
  activeUsers: {
    count: number;
    status: "good" | "warning" | "critical";
    description: string;
    lastUpdated: string;
  };
  sslCertificate: {
    status: "Valid" | "Expired" | "Expiring Soon" | string;
    expiresAt: string;
    issuer: string;
  };
}

export async function fetchSystemMetrics(): Promise<MetricsData> {
  try {
    const response = await fetch("/api/status/metrics", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.metrics;
  } catch (error: unknown) {
    console.error("Failed to fetch system metrics:", error);

    // Return fallback data
    return {
      databasePerformance: {
        active: 0,
        max: 100,
        activeQueries: 0,
        status: "critical",
        description: "Connection Pool Status",
      },
      apiPerformance: {
        requestsPerMinute: 0,
        status: "DOWN",
      },
      errorRate: {
        rate: "0.00%",
        status: "good",
        description: "Failed requests",
        totalRequests: 0,
        recentRequests: 0,
      },
      storageUsage: {
        used: "0 GB",
        total: "10 GB",
        percentage: 0,
        status: "good",
        description: "Database storage",
        tableCount: 0,
      },
      activeUsers: {
        count: 0,
        status: "warning",
        description: "Currently online",
        lastUpdated: new Date().toISOString(),
      },
      sslCertificate: {
        status: "Valid",
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        issuer: "Let's Encrypt",
      },
    };
  }
}
