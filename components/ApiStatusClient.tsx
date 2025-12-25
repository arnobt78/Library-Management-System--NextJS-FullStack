"use client";

/**
 * ApiStatusClient Component
 *
 * Client Component for displaying API status and system metrics.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useServiceHealth and useSystemMetrics hooks with SSR initial data
 * - Displays skeleton loaders while fetching
 * - Shows error state if fetch fails
 * - Manual refresh functionality preserved
 * - All existing UI, styling, and functionality preserved
 */

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Server,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Zap,
  Activity,
  TrendingUp,
  Database,
  FileText,
  Lock,
  Globe,
  HardDrive,
  Users,
  Shield,
} from "lucide-react";
import { useServiceHealth, useSystemMetrics } from "@/hooks/useQueries";
import type { ServiceStatus } from "@/lib/services/health-monitor";
import type { MetricsData } from "@/lib/services/metrics-monitor";
import type { SystemMetric } from "@/lib/services/metrics-monitor";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiStatusClientProps {
  /**
   * Initial service health data from SSR (prevents duplicate fetch)
   */
  initialServices?: ServiceStatus[];
  /**
   * Initial system metrics data from SSR (prevents duplicate fetch)
   */
  initialMetrics?: MetricsData | null;
}

const ApiStatusClient = ({
  initialServices,
  initialMetrics,
}: ApiStatusClientProps) => {
  // React Query hooks with SSR initial data
  const {
    data: servicesData,
    isLoading: servicesLoading,
    isError: servicesError,
    error: servicesErrorData,
    refetch: refetchServices,
  } = useServiceHealth(initialServices);

  const {
    data: metricsData,
    isLoading: metricsLoading,
    isError: metricsError,
    error: metricsErrorData,
    refetch: refetchMetrics,
  } = useSystemMetrics(initialMetrics ?? undefined);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [uptime, setUptime] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Get service icon with colors (defined before useMemo to avoid hoisting issues)
  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case "API Server":
        return <Server className="size-5 text-blue-500" />;
      case "Database":
        return <Database className="size-5 text-green-500" />;
      case "Authentication":
        return <Lock className="size-5 text-purple-500" />;
      case "File Storage":
        return <HardDrive className="size-5 text-orange-500" />;
      case "Email Service":
        return <FileText className="size-5 text-pink-500" />;
      case "External APIs":
        return <Globe className="size-5 text-cyan-500" />;
      default:
        return <Server className="size-5 text-gray-500" />;
    }
  };

  // Convert metrics data to component format (defined before useMemo to avoid hoisting issues)
  const convertMetricsToSystemMetrics = (
    metricsData: MetricsData
  ): SystemMetric[] => {
    return [
      {
        title: "Database Performance",
        value: `Active: ${metricsData.databasePerformance.active}/${metricsData.databasePerformance.max}`,
        status: metricsData.databasePerformance.status,
        icon: <Database className="size-5" />,
        description: metricsData.databasePerformance.description,
        details: metricsData.databasePerformance,
      },
      {
        title: "API Performance",
        value: `${metricsData.apiPerformance.requestsPerMinute} req/min`,
        status:
          metricsData.apiPerformance.status === "HEALTHY" ? "good" : "critical",
        icon: <TrendingUp className="size-5" />,
        description: "Requests per minute",
        details: metricsData.apiPerformance,
      },
      {
        title: "Error Rate",
        value: metricsData.errorRate.rate,
        status: metricsData.errorRate.status,
        icon: <AlertCircle className="size-5" />,
        description: metricsData.errorRate.description,
        details: metricsData.errorRate,
      },
      {
        title: "Storage Usage",
        value: `${metricsData.storageUsage.used} / ${metricsData.storageUsage.total}`,
        status: metricsData.storageUsage.status,
        icon: <HardDrive className="size-5" />,
        description: metricsData.storageUsage.description,
        details: metricsData.storageUsage,
      },
      {
        title: "Active Users",
        value: metricsData.activeUsers.count.toString(),
        status: metricsData.activeUsers.status,
        icon: <Users className="size-5" />,
        description: metricsData.activeUsers.description,
        details: metricsData.activeUsers,
      },
      {
        title: "SSL Certificate",
        value: metricsData.sslCertificate.status,
        status:
          metricsData.sslCertificate.status === "Valid" ? "good" : "critical",
        icon: <Shield className="size-5" />,
        description: "Security status",
        details: metricsData.sslCertificate,
      },
    ];
  };

  // Get services with icons
  const services: ServiceStatus[] = useMemo(() => {
    if (!servicesData || servicesData.length === 0) return [];
    return servicesData.map((service) => ({
      ...service,
      icon: getServiceIcon(service.name),
    }));
  }, [servicesData]);

  // Convert metrics to system metrics format
  const systemMetrics: SystemMetric[] = useMemo(() => {
    if (!metricsData) return [];
    return convertMetricsToSystemMetrics(metricsData);
  }, [metricsData]);

  // Calculate derived values from services
  const overallStatus = useMemo(() => {
    if (!services || services.length === 0) return "HEALTHY" as const;
    const healthyServices = services.filter(
      (s) => s.status === "HEALTHY"
    ).length;
    const totalServices = services.length;

    if (healthyServices === totalServices) {
      return "HEALTHY" as const;
    } else if (healthyServices > totalServices / 2) {
      return "DEGRADED" as const;
    } else {
      return "DOWN" as const;
    }
  }, [services]);

  const responseTime = useMemo(() => {
    if (!services || services.length === 0) return 0;
    const avgResponseTime =
      services.reduce((sum, s) => sum + s.responseTime, 0) / services.length;
    return Math.round(avgResponseTime);
  }, [services]);

  const healthScore = useMemo(() => {
    if (!services || services.length === 0) return 100;
    const avgPerformance =
      services.reduce((sum, s) => sum + s.performanceValue, 0) /
      services.length;
    return Math.round(avgPerformance);
  }, [services]);

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "bg-green-100 text-green-800 border-green-200";
      case "DEGRADED":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DOWN":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return <CheckCircle className="size-6 text-green-600" />;
      case "DEGRADED":
        return <AlertCircle className="size-6 text-yellow-600" />;
      case "DOWN":
        return <XCircle className="size-6 text-red-600" />;
      default:
        return <AlertCircle className="size-6 text-gray-600" />;
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case "Excellent":
        return "text-green-600";
      case "Good":
        return "text-blue-600";
      case "Slow":
        return "text-yellow-600";
      case "Poor":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // Initialize last checked date on mount
  useEffect(() => {
    setLastChecked(new Date());
  }, []);

  // Update uptime every second
  useEffect(() => {
    const uptimeInterval = setInterval(() => {
      setUptime((prev) => {
        let newSeconds = prev.seconds + 1;
        let newMinutes = prev.minutes;
        let newHours = prev.hours;

        if (newSeconds >= 60) {
          newSeconds = 0;
          newMinutes += 1;
        }
        if (newMinutes >= 60) {
          newMinutes = 0;
          newHours += 1;
        }

        return { hours: newHours, minutes: newMinutes, seconds: newSeconds };
      });
    }, 1000);

    return () => {
      clearInterval(uptimeInterval);
    };
  }, []);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLastChecked(new Date());

    try {
      // Refetch both queries
      await Promise.all([refetchServices(), refetchMetrics()]);
    } catch (error) {
      console.error("Failed to refresh service health:", error);
    }

    // Simulate API call delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    setIsRefreshing(false);
  };

  // Show skeleton while loading (only if no initial data)
  const isLoading =
    (servicesLoading && !initialServices) ||
    (metricsLoading && !initialMetrics);
  const isError = servicesError || metricsError;

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-8">
        {/* Header Skeleton */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="mb-2 h-10 w-48" />
            <Skeleton className="h-6 w-80" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Overall System Status Skeleton */}
        <Card className="mb-4 border-gray-700 bg-gray-800 sm:mb-8">
          <CardHeader>
            <Skeleton className="mb-2 h-6 w-48" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={`status-skeleton-${i}`} className="text-center">
                  <Skeleton className="mx-auto mb-2 size-8" />
                  <Skeleton className="mx-auto mb-1 h-4 w-24" />
                  <Skeleton className="mx-auto h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Services Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card
              key={`service-skeleton-${i}`}
              className="border-gray-600 bg-gray-700"
            >
              <CardHeader>
                <Skeleton className="mb-2 h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-4 h-20 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Metrics Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card
              key={`metric-skeleton-${i}`}
              className="border-gray-600 bg-gray-700"
            >
              <CardHeader>
                <Skeleton className="mb-2 h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="space-y-4 sm:space-y-8">
        <div className="py-6 text-center sm:py-8">
          <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
            Failed to load API status
          </p>
          <p className="text-xs text-gray-500 sm:text-sm">
            {servicesErrorData instanceof Error
              ? servicesErrorData.message
              : metricsErrorData instanceof Error
                ? metricsErrorData.message
                : "An unknown error occurred"}
          </p>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-light-100 sm:text-4xl">API Status</h1>
          <p className="text-sm text-light-100 sm:text-lg">
            Real-time monitoring of BookWise API services
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <RefreshCw
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Overall System Status */}
      <Card className="mb-4 border-gray-700 bg-gray-800 sm:mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-light-100 sm:text-lg">
            <Server className="size-4 sm:size-5" />
            Overall System Status
          </CardTitle>
          <p className="text-xs text-light-200 sm:text-sm">
            Last checked:{" "}
            {lastChecked ? lastChecked.toLocaleString() : "Loading..."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                {getStatusIcon(overallStatus)}
              </div>
              <p className="text-xs text-light-200 sm:text-sm">System Status</p>
              <Badge className={`mt-1 ${getStatusColor(overallStatus)}`}>
                {overallStatus}
              </Badge>
            </div>
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                <Zap className="size-4 text-blue-600" />
              </div>
              <p className="text-xs text-light-200 sm:text-sm">Response Time</p>
              <p className="text-xl font-bold text-light-100 sm:text-2xl">
                {responseTime}ms
              </p>
            </div>
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                <Clock className="size-4 text-green-600" />
              </div>
              <p className="text-xs text-light-200 sm:text-sm">Uptime</p>
              <p className="text-xl font-bold text-light-100 sm:text-2xl">
                {uptime.hours}h {uptime.minutes}m {uptime.seconds}s
              </p>
            </div>
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                <TrendingUp className="size-4 text-purple-600" />
              </div>
              <p className="text-xs text-light-200 sm:text-sm">Health Score</p>
              <p className="text-xl font-bold text-light-100 sm:text-2xl">
                {healthScore.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-4 sm:mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-light-100 sm:text-sm">
                Overall Health
              </span>
              <span className="text-xs text-light-200 sm:text-sm">
                {healthScore.toFixed(1)}%
              </span>
            </div>
            <Progress value={healthScore} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card className="mb-4 border-gray-700 bg-gray-800 sm:mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-light-100 sm:text-lg">
            <Activity className="size-4 text-green-500 sm:size-5" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="py-6 text-center text-sm text-light-200 sm:py-8 sm:text-base">
              No service data available. Please refresh.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => (
                <Card
                  key={index}
                  className="relative border-gray-600 bg-gray-700"
                >
                  <CardHeader className="pb-2 sm:pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        {getServiceIcon(service.name)}
                        <CardTitle className="text-base text-light-100 sm:text-lg">
                          {service.name}
                        </CardTitle>
                      </div>
                      <Badge className={`w-fit ${getStatusColor(service.status)}`}>
                        {service.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-light-200 sm:text-sm">
                      {service.description}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between">
                        <span className="text-xs text-light-200 sm:text-sm">
                          Response Time:
                        </span>
                        <span className="text-xs font-semibold text-light-100 sm:text-sm">
                          {service.responseTime}ms
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                        <span className="text-xs text-light-200 sm:text-sm">
                          Endpoint:
                        </span>
                        <span className="break-all font-mono text-xs text-light-100 sm:text-sm">
                          {service.endpoint}
                        </span>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between">
                          <span className="text-xs text-light-200 sm:text-sm">
                            Performance:
                          </span>
                          <span
                            className={`text-xs font-medium sm:text-sm ${getPerformanceColor(service.performance)}`}
                          >
                            {service.performance}
                          </span>
                        </div>
                        <Progress
                          value={service.performanceValue}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Metrics */}
      <Card className="border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-light-100 sm:text-lg">
            <TrendingUp className="size-4 text-purple-500 sm:size-5" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {systemMetrics.length === 0 ? (
            <div className="py-6 text-center text-sm text-light-200 sm:py-8 sm:text-base">
              No system metrics available. Please refresh.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {systemMetrics.map((metric, index) => {
                // Get colorful icon based on metric title
                const getMetricIcon = () => {
                  if (metric.title.includes("Database")) {
                    return <Database className="size-4 text-green-500 sm:size-5" />;
                  } else if (metric.title.includes("API Performance")) {
                    return <TrendingUp className="size-4 text-blue-500 sm:size-5" />;
                  } else if (metric.title.includes("Error Rate")) {
                    return <AlertCircle className="size-4 text-red-500 sm:size-5" />;
                  } else if (metric.title.includes("Storage")) {
                    return <HardDrive className="size-4 text-orange-500 sm:size-5" />;
                  } else if (metric.title.includes("Active Users")) {
                    return <Users className="size-4 text-cyan-500 sm:size-5" />;
                  } else if (metric.title.includes("SSL")) {
                    return <Shield className="size-4 text-yellow-500 sm:size-5" />;
                  }
                  return metric.icon;
                };

                return (
                  <Card
                    key={index}
                    className="relative border-gray-600 bg-gray-700"
                  >
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div>{getMetricIcon()}</div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-light-100 sm:text-sm">
                            {metric.title}
                          </p>
                          <p
                            className={`text-base font-bold sm:text-lg ${getMetricStatusColor(metric.status)}`}
                          >
                            {metric.value}
                          </p>
                          <p className="text-xs text-light-200">
                            {metric.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="my-4 text-center">
        <p className="text-xs text-light-100 sm:text-sm">
          BookWise University Library Management System - API Status Monitor
        </p>
        <p className="text-xs text-light-100">
          Real-time monitoring • Last updated:{" "}
          {lastChecked ? lastChecked.toLocaleTimeString() : "Loading..."}
        </p>
      </div>
    </>
  );
};

export default ApiStatusClient;
