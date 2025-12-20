import React from "react";

interface HealthCheckResult {
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  responseTime: string;
  endpoint: string;
  performance: "Excellent" | "Good" | "Slow" | "Poor";
  performanceValue: number;
  details?: Record<string, unknown> | unknown;
  timestamp: string;
  error?: string;
}

export interface ServiceStatus {
  name: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  responseTime: number;
  endpoint: string;
  description: string;
  icon: React.ReactNode;
  performance: "Excellent" | "Good" | "Slow" | "Poor";
  performanceValue: number;
  details?: Record<string, unknown> | unknown;
  lastChecked?: string;
}

export async function fetchServiceHealth(
  serviceName: string
): Promise<HealthCheckResult> {
  try {
    const response = await fetch(`/api/status/${serviceName}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: unknown) {
    return {
      status: "DOWN",
      responseTime: "0ms",
      endpoint: serviceName,
      performance: "Poor",
      performanceValue: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

export async function fetchAllServicesHealth(): Promise<ServiceStatus[]> {
  const services = [
    {
      name: "api-server",
      displayName: "API Server",
      description: "Main API server health check",
    },
    {
      name: "database",
      displayName: "Database",
      description: "PostgreSQL database connection status",
    },
    {
      name: "file-storage",
      displayName: "File Storage",
      description: "Image and file storage service",
    },
    {
      name: "authentication",
      displayName: "Authentication",
      description: "User authentication service",
    },
    {
      name: "email-service",
      displayName: "Email Service",
      description: "Email notification service",
    },
    {
      name: "external-apis",
      displayName: "External APIs",
      description: "External API connections",
    },
  ];

  const healthChecks = await Promise.allSettled(
    services.map((service) => fetchServiceHealth(service.name))
  );

  return healthChecks.map((result, index) => {
    const service = services[index];
    const healthData =
      result.status === "fulfilled"
        ? result.value
        : {
            status: "DOWN" as const,
            responseTime: "0ms",
            endpoint: service.name,
            performance: "Poor" as const,
            performanceValue: 0,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Failed to fetch",
            timestamp: new Date().toISOString(),
            details: undefined,
          };

    return {
      name: service.displayName,
      status: healthData.status,
      responseTime: parseInt(healthData.responseTime.replace("ms", "")),
      endpoint: healthData.endpoint,
      description: service.description,
      icon: null, // Will be set by the component
      performance: healthData.performance,
      performanceValue: healthData.performanceValue,
      details: healthData.details,
      lastChecked: healthData.timestamp,
    };
  });
}
