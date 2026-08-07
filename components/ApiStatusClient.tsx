"use client";

/**
 * ApiStatusClient — merged server health + embedded PerformanceDashboard.
 * Hero matches All Books / My Profile; sections use GlassSectionHeader + glass cards.
 * Refresh refetches RQ health/metrics and shows dynamic showToast.status.*.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import GlassSectionHeader from "@/components/GlassSectionHeader";
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
import { useQueryClient } from "@tanstack/react-query";
import { invalidateDomains } from "@/lib/utils/queryInvalidation";
import type { ServiceStatus } from "@/lib/services/health-monitor";
import type { MetricsData } from "@/lib/services/metrics-monitor";
import type { SystemMetric } from "@/lib/services/metrics-monitor";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const GLASS_CARD =
  "border-white/10 bg-dark-300/60 text-light-100 shadow-[0_12px_28px_rgba(0,0,0,0.25)] backdrop-blur-sm";
const GLASS_TILE =
  "rounded-xl border border-white/10 bg-dark-300/40 p-3 shadow-sm backdrop-blur-sm sm:p-4";

interface ApiStatusClientProps {
  initialServices?: ServiceStatus[];
  initialMetrics?: MetricsData | null;
  /** Enables authenticated operator diagnostics; public mode uses liveness only. */
  operatorMode?: boolean;
}

function deriveOverallStatus(
  list: ServiceStatus[],
): "HEALTHY" | "DEGRADED" | "DOWN" {
  if (!list.length) return "HEALTHY";
  const healthy = list.filter((s) => s.status === "HEALTHY").length;
  if (healthy === list.length) return "HEALTHY";
  if (healthy > list.length / 2) return "DEGRADED";
  return "DOWN";
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "HEALTHY":
      return "";
    case "DEGRADED":
      return "";
    case "DOWN":
      return "border-red-400/40 from-red-500/25 via-red-500/10 to-red-500/5";
    default:
      return "";
  }
}

function statusBadgeVariant(
  status: string,
): "glassReturned" | "glassPending" | "glassMuted" {
  switch (status) {
    case "HEALTHY":
      return "glassReturned";
    case "DEGRADED":
      return "glassPending";
    default:
      return "glassMuted";
  }
}

const ApiStatusClient = ({
  initialServices,
  initialMetrics,
  operatorMode = true,
}: ApiStatusClientProps) => {
  const queryClient = useQueryClient();
  const {
    data: servicesData,
    isLoading: servicesLoading,
    isError: servicesError,
    error: servicesErrorData,
    refetch: refetchServices,
  } = useServiceHealth(initialServices, operatorMode);

  const {
    data: metricsData,
    isLoading: metricsLoading,
    isError: metricsError,
    error: metricsErrorData,
    refetch: refetchMetrics,
  } = useSystemMetrics(initialMetrics ?? undefined, operatorMode);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [uptime, setUptime] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case "API Server":
      case "Application":
        return <Server className="size-5 text-blue-400" />;
      case "Database":
        return <Database className="size-5 text-emerald-400" />;
      case "Authentication":
        return <Lock className="size-5 text-violet-400" />;
      case "File Storage":
        return <HardDrive className="size-5 text-orange-400" />;
      case "Email Service":
        return <FileText className="size-5 text-pink-400" />;
      case "External APIs":
        return <Globe className="size-5 text-cyan-400" />;
      default:
        return <Server className="size-5 text-light-200" />;
    }
  };

  const convertMetricsToSystemMetrics = (data: MetricsData): SystemMetric[] => {
    return [
      {
        title: "Database Performance",
        value: `Active: ${data.databasePerformance.active}/${data.databasePerformance.max}`,
        status: data.databasePerformance.status,
        icon: <Database className="size-5" />,
        description: data.databasePerformance.description,
        details: data.databasePerformance,
      },
      {
        title: "API Performance",
        value:
          data.apiPerformance.status === "HEALTHY"
            ? `${data.apiPerformance.requestsPerMinute} req/min`
            : "Unavailable",
        status: data.apiPerformance.status === "HEALTHY" ? "good" : "critical",
        icon: <TrendingUp className="size-5" />,
        description: "Requests per minute",
        details: data.apiPerformance,
      },
      {
        title: "Error Rate",
        value: data.errorRate.rate,
        status: data.errorRate.status,
        icon: <AlertCircle className="size-5" />,
        description: data.errorRate.description,
        details: data.errorRate,
      },
      {
        title: "Storage Usage",
        value: `${data.storageUsage.used} / ${data.storageUsage.total}`,
        status: data.storageUsage.status,
        icon: <HardDrive className="size-5" />,
        description: data.storageUsage.description,
        details: data.storageUsage,
      },
      {
        title: "Active Users",
        value: data.activeUsers.count.toString(),
        status: data.activeUsers.status,
        icon: <Users className="size-5" />,
        description: data.activeUsers.description,
        details: data.activeUsers,
      },
      {
        title: "SSL Certificate",
        value: data.sslCertificate.status,
        status: data.sslCertificate.status === "Valid" ? "good" : "critical",
        icon: <Shield className="size-5" />,
        description: "Security status",
        details: data.sslCertificate,
      },
    ];
  };

  const services: ServiceStatus[] = useMemo(() => {
    if (!servicesData || servicesData.length === 0) return [];
    return servicesData.map((service) => ({
      ...service,
      icon: getServiceIcon(service.name),
    }));
  }, [servicesData]);

  const systemMetrics: SystemMetric[] = useMemo(() => {
    if (!metricsData) return [];
    return convertMetricsToSystemMetrics(metricsData);
  }, [metricsData]);

  const overallStatus = useMemo(
    () => deriveOverallStatus(services),
    [services],
  );

  const responseTime = useMemo(() => {
    if (!services.length) return 0;
    return Math.round(
      services.reduce((sum, s) => sum + s.responseTime, 0) / services.length,
    );
  }, [services]);

  const healthScore = useMemo(() => {
    if (!services.length) return 100;
    return Math.round(
      services.reduce((sum, s) => sum + s.performanceValue, 0) /
        services.length,
    );
  }, [services]);

  const healthyCount = useMemo(
    () => services.filter((s) => s.status === "HEALTHY").length,
    [services],
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return <CheckCircle className="size-6 text-emerald-400" />;
      case "DEGRADED":
        return <AlertCircle className="size-6 text-amber-400" />;
      case "DOWN":
        return <XCircle className="size-6 text-red-400" />;
      default:
        return <AlertCircle className="size-6 text-light-200" />;
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case "Excellent":
        return "text-emerald-400";
      case "Good":
        return "text-blue-400";
      case "Slow":
        return "text-amber-400";
      case "Poor":
        return "text-red-400";
      default:
        return "text-light-200";
    }
  };

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-emerald-400";
      case "warning":
        return "text-amber-400";
      case "critical":
        return "text-red-400";
      default:
        return "text-light-200";
    }
  };

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
    return () => clearInterval(uptimeInterval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Central invalidate so sibling ops/analytics observers stay coherent,
      // then refetch the mounted health/metrics queries.
      await invalidateDomains(queryClient, ["operations", "analytics"]);
      const results = await Promise.all([
        refetchServices(),
        ...(operatorMode ? [refetchMetrics()] : []),
      ]);
      const servicesResult = results[0];
      if (servicesResult.isError) {
        throw (
          servicesResult.error ?? new Error("Failed to refetch service health")
        );
      }
      const list = (servicesResult.data ?? []) as ServiceStatus[];
      const healthy = list.filter((s) => s.status === "HEALTHY").length;
      const overall = deriveOverallStatus(list);
      const avgMs = list.length
        ? Math.round(
            list.reduce((sum, s) => sum + s.responseTime, 0) / list.length,
          )
        : 0;
      setLastChecked(new Date());
      showToast.status.refreshSuccess({
        overallStatus: overall,
        healthyCount: healthy,
        totalCount: list.length,
        responseTimeMs: avgMs,
      });
    } catch (error) {
      showToast.status.refreshError(
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading =
    (servicesLoading && !initialServices) ||
    (operatorMode && metricsLoading && !initialMetrics);
  const isError = servicesError || (operatorMode && metricsError);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="mb-2 h-10 w-48" />
            <Skeleton className="h-6 w-80" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <Card className={cn(GLASS_CARD)}>
          <CardHeader>
            <Skeleton className="mb-2 h-6 w-48" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton
                  key={`status-skeleton-${i}`}
                  className="h-24 w-full"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="py-6 text-center sm:py-8">
          <p className="mb-2 text-base font-medium text-red-400 sm:text-lg">
            Failed to load API status
          </p>
          <p className="text-xs text-light-200 sm:text-sm">
            {servicesErrorData instanceof Error
              ? servicesErrorData.message
              : metricsErrorData instanceof Error
                ? metricsErrorData.message
                : "An unknown error occurred"}
          </p>
          <Button onClick={handleRefresh} className="mt-4 gap-2">
            <RefreshCw className="size-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Match All Books / My Profile hero */}
      <div className="mb-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-medium text-light-100 sm:text-3xl">
            API Status
          </h1>
          <p className="text-sm text-light-200 sm:text-base">
            Real-time monitoring of BookWise API services
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <section className="space-y-2 sm:space-y-4">
        <GlassSectionHeader
          icon={<Server className="size-5 text-primary" />}
          title="Overall System Status"
          subtitle={
            lastChecked
              ? `Last checked: ${lastChecked.toLocaleString()}`
              : "Last checked: awaiting first refresh"
          }
        />
        <Card className={GLASS_CARD}>
          <CardContent className="p-2 sm:p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
              <div className={cn(GLASS_TILE, "text-center")}>
                <div className="mb-2 flex justify-center">
                  {getStatusIcon(overallStatus)}
                </div>
                <p className="text-xs text-light-200 sm:text-sm">
                  System Status
                </p>
                <Badge
                  variant={statusBadgeVariant(overallStatus)}
                  className={cn("mt-1", statusBadgeClass(overallStatus))}
                >
                  {overallStatus}
                </Badge>
              </div>
              <div className={cn(GLASS_TILE, "text-center")}>
                <div className="mb-2 flex justify-center">
                  <Zap className="size-5 text-blue-400" />
                </div>
                <p className="text-xs text-light-200 sm:text-sm">
                  Response Time
                </p>
                <p className="text-xl font-medium text-light-100">
                  {responseTime}ms
                </p>
              </div>
              <div className={cn(GLASS_TILE, "text-center")}>
                <div className="mb-2 flex justify-center">
                  <Clock className="size-5 text-emerald-400" />
                </div>
                <p className="text-xs text-light-200 sm:text-sm">Uptime</p>
                <p className="text-xl font-medium text-light-100">
                  {uptime.hours}h {uptime.minutes}m {uptime.seconds}s
                </p>
              </div>
              <div className={cn(GLASS_TILE, "text-center")}>
                <div className="mb-2 flex justify-center">
                  <TrendingUp className="size-5 text-violet-400" />
                </div>
                <p className="text-xs text-light-200 sm:text-sm">
                  Health Score
                </p>
                <p className="text-xl font-medium text-light-100">
                  {healthScore.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mt-4 sm:mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-light-100 sm:text-sm">
                  Overall Health
                </span>
                <span className="text-xs text-light-200 sm:text-sm">
                  {healthyCount}/{services.length || 0} healthy ·{" "}
                  {healthScore.toFixed(1)}%
                </span>
              </div>
              <Progress value={healthScore} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2 sm:space-y-4">
        <GlassSectionHeader
          icon={<Activity className="size-5 text-primary" />}
          title="Service Status"
          subtitle="Live checks against /api/status endpoints"
        />
        <Card className={GLASS_CARD}>
          <CardContent className="p-2 sm:p-4">
            {services.length === 0 ? (
              <div className="py-6 text-center text-sm text-light-200">
                No service data available. Please refresh.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <Card
                    key={service.name}
                    className="relative border-white/10 bg-dark-300/40 backdrop-blur-sm"
                  >
                    <CardHeader className="pb-2 sm:pb-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          {getServiceIcon(service.name)}
                          <CardTitle className="text-base text-light-100 sm:text-lg">
                            {service.name}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={statusBadgeVariant(service.status)}
                          className={cn(
                            "w-fit",
                            statusBadgeClass(service.status),
                          )}
                        >
                          {service.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-light-200 sm:text-sm">
                        {service.description}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 sm:space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-light-200 sm:text-sm">
                            Response Time:
                          </span>
                          <span className="text-xs font-medium text-light-100 sm:text-sm">
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
      </section>

      {operatorMode && (
        <section className="space-y-2 sm:space-y-4">
          <GlassSectionHeader
            icon={<TrendingUp className="size-5 text-primary" />}
            title="System Metrics"
            subtitle="Operator diagnostics (admin session)"
          />
          <Card className={GLASS_CARD}>
            <CardContent className="p-2 sm:p-4">
              {systemMetrics.length === 0 ? (
                <div className="py-6 text-center text-sm text-light-200">
                  No system metrics available. Please refresh.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {systemMetrics.map((metric) => {
                    const getMetricIcon = () => {
                      if (metric.title.includes("Database")) {
                        return (
                          <Database className="size-4 text-emerald-400 sm:size-5" />
                        );
                      }
                      if (metric.title.includes("API Performance")) {
                        return (
                          <TrendingUp className="size-4 text-blue-400 sm:size-5" />
                        );
                      }
                      if (metric.title.includes("Error Rate")) {
                        return (
                          <AlertCircle className="size-4 text-red-400 sm:size-5" />
                        );
                      }
                      if (metric.title.includes("Storage")) {
                        return (
                          <HardDrive className="size-4 text-orange-400 sm:size-5" />
                        );
                      }
                      if (metric.title.includes("Active Users")) {
                        return (
                          <Users className="size-4 text-cyan-400 sm:size-5" />
                        );
                      }
                      if (metric.title.includes("SSL")) {
                        return (
                          <Shield className="size-4 text-amber-400 sm:size-5" />
                        );
                      }
                      return metric.icon;
                    };

                    return (
                      <div key={metric.title} className={GLASS_TILE}>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div>{getMetricIcon()}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-light-100 sm:text-sm">
                              {metric.title}
                            </p>
                            <p
                              className={`text-base font-medium sm:text-lg ${getMetricStatusColor(metric.status)}`}
                            >
                              {metric.value}
                            </p>
                            <p className="text-xs text-light-200">
                              {metric.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <div className="border-t border-white/10 pt-4 sm:pt-6">
        <PerformanceDashboard embedded />
      </div>
    </div>
  );
};

export default ApiStatusClient;
