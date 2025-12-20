"use client";

import React, { useState, useEffect } from "react";
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
  Wifi,
  Globe,
  HardDrive,
  Users,
  Shield,
} from "lucide-react";
import {
  fetchAllServicesHealth,
  ServiceStatus,
} from "@/lib/services/health-monitor";
import {
  fetchSystemMetrics,
  SystemMetric,
  MetricsData,
} from "@/lib/services/metrics-monitor";

interface ApiStatusClientProps {
  services: ServiceStatus[];
  systemMetrics: SystemMetric[];
}

const ApiStatusClient = ({
  services: initialServices,
  systemMetrics: initialMetrics,
}: ApiStatusClientProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [overallStatus, setOverallStatus] = useState<
    "HEALTHY" | "DEGRADED" | "DOWN"
  >("HEALTHY");
  const [responseTime, setResponseTime] = useState(0);
  const [uptime, setUptime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [healthScore, setHealthScore] = useState(100);
  const [services, setServices] = useState<ServiceStatus[]>(initialServices);
  const [systemMetrics, setSystemMetrics] =
    useState<SystemMetric[]>(initialMetrics);

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

  // Get service icon with colors
  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case "API Server":
        return <Server className="size-5 text-blue-500" />;
      case "Database":
        return <Database className="size-5 text-green-500" />;
      case "File Storage":
        return <FileText className="size-5 text-purple-500" />;
      case "Authentication":
        return <Lock className="size-5 text-yellow-500" />;
      case "Email Service":
        return <Wifi className="size-5 text-pink-500" />;
      case "External APIs":
        return <Globe className="size-5 text-cyan-500" />;
      default:
        return <Activity className="size-5 text-gray-500" />;
    }
  };

  // Convert metrics data to component format
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

  // Fetch real service data and initialize monitoring
  useEffect(() => {
    // Initialize the date on client side to avoid hydration mismatch
    setLastChecked(new Date());

    // Fetch real service health data
    const fetchServices = async () => {
      try {
        const realServices = await fetchAllServicesHealth();

        // Add icons to services
        const servicesWithIcons = realServices.map((service) => ({
          ...service,
          icon: getServiceIcon(service.name),
        }));

        setServices(servicesWithIcons);

        // Calculate overall status based on service health
        const healthyServices = servicesWithIcons.filter(
          (s) => s.status === "HEALTHY"
        ).length;
        const totalServices = servicesWithIcons.length;

        if (healthyServices === totalServices) {
          setOverallStatus("HEALTHY");
        } else if (healthyServices > totalServices / 2) {
          setOverallStatus("DEGRADED");
        } else {
          setOverallStatus("DOWN");
        }

        // Calculate average response time
        const avgResponseTime =
          servicesWithIcons.reduce((sum, s) => sum + s.responseTime, 0) /
          totalServices;
        setResponseTime(Math.round(avgResponseTime));

        // Calculate health score based on service performance
        const avgPerformance =
          servicesWithIcons.reduce((sum, s) => sum + s.performanceValue, 0) /
          totalServices;
        setHealthScore(Math.round(avgPerformance));
      } catch (error) {
        console.error("Failed to fetch service health:", error);
      }
    };

    fetchServices();

    // Fetch real system metrics
    const fetchMetrics = async () => {
      try {
        const realMetrics = await fetchSystemMetrics();
        const convertedMetrics = convertMetricsToSystemMetrics(realMetrics);
        setSystemMetrics(convertedMetrics);
      } catch (error) {
        console.error("Failed to fetch system metrics:", error);
      }
    };

    fetchMetrics();

    // Update uptime every second
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

    // Refresh service data every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchServices();
      fetchMetrics();
    }, 30000);

    return () => {
      clearInterval(uptimeInterval);
      clearInterval(refreshInterval);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLastChecked(new Date());

    try {
      const realServices = await fetchAllServicesHealth();

      // Add icons to services
      const servicesWithIcons = realServices.map((service) => ({
        ...service,
        icon: getServiceIcon(service.name),
      }));

      setServices(servicesWithIcons);

      // Calculate overall status based on service health
      const healthyServices = servicesWithIcons.filter(
        (s) => s.status === "HEALTHY"
      ).length;
      const totalServices = servicesWithIcons.length;

      if (healthyServices === totalServices) {
        setOverallStatus("HEALTHY");
      } else if (healthyServices > totalServices / 2) {
        setOverallStatus("DEGRADED");
      } else {
        setOverallStatus("DOWN");
      }

      // Calculate average response time
      const avgResponseTime =
        servicesWithIcons.reduce((sum, s) => sum + s.responseTime, 0) /
        totalServices;
      setResponseTime(Math.round(avgResponseTime));

      // Calculate health score based on service performance
      const avgPerformance =
        servicesWithIcons.reduce((sum, s) => sum + s.performanceValue, 0) /
        totalServices;
      setHealthScore(Math.round(avgPerformance));

      // Also refresh metrics
      const realMetrics = await fetchSystemMetrics();
      const convertedMetrics = convertMetricsToSystemMetrics(realMetrics);
      setSystemMetrics(convertedMetrics);
    } catch (error) {
      console.error("Failed to refresh service health:", error);
    }

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsRefreshing(false);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-light-100">API Status</h1>
          <p className="text-lg text-light-100">
            Real-time monitoring of BookWise API services
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Overall System Status */}
      <Card className="mb-8 border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-light-100">
            <Server className="size-5" />
            Overall System Status
          </CardTitle>
          <p className="text-sm text-light-200">
            Last checked:{" "}
            {lastChecked ? lastChecked.toLocaleString() : "Loading..."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                {getStatusIcon(overallStatus)}
              </div>
              <p className="text-sm text-light-200">System Status</p>
              <Badge className={`mt-1 ${getStatusColor(overallStatus)}`}>
                {overallStatus}
              </Badge>
            </div>
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                <Zap className="size-4 text-blue-600" />
              </div>
              <p className="text-sm text-light-200">Response Time</p>
              <p className="text-2xl font-bold text-light-100">{responseTime}ms</p>
            </div>
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                <Clock className="size-4 text-green-600" />
              </div>
              <p className="text-sm text-light-200">Uptime</p>
              <p className="text-2xl font-bold text-light-100">
                {uptime.hours}h {uptime.minutes}m {uptime.seconds}s
              </p>
            </div>
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                <TrendingUp className="size-4 text-purple-600" />
              </div>
              <p className="text-sm text-light-200">Health Score</p>
              <p className="text-2xl font-bold text-light-100">{healthScore.toFixed(1)}%</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-light-100">Overall Health</span>
              <span className="text-sm text-light-200">
                {healthScore.toFixed(1)}%
              </span>
            </div>
            <Progress value={healthScore} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card className="mb-8 border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-light-100">
            <Activity className="size-5 text-green-500" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <Card key={index} className="relative border-gray-600 bg-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getServiceIcon(service.name)}
                      <CardTitle className="text-lg text-light-100">{service.name}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(service.status)}>
                      {service.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-light-200">{service.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-light-200">
                        Response Time:
                      </span>
                      <span className="font-semibold text-light-100">
                        {service.responseTime}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-light-200">Endpoint:</span>
                      <span className="font-mono text-sm text-light-100">
                        {service.endpoint}
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between">
                        <span className="text-sm text-light-200">
                          Performance:
                        </span>
                        <span
                          className={`text-sm font-medium ${getPerformanceColor(service.performance)}`}
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
        </CardContent>
      </Card>

      {/* System Metrics */}
      <Card className="border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-light-100">
            <TrendingUp className="size-5 text-purple-500" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemMetrics.map((metric, index) => {
              // Get colorful icon based on metric title
              const getMetricIcon = () => {
                if (metric.title.includes("Database")) {
                  return <Database className="size-5 text-green-500" />;
                } else if (metric.title.includes("API Performance")) {
                  return <TrendingUp className="size-5 text-blue-500" />;
                } else if (metric.title.includes("Error Rate")) {
                  return <AlertCircle className="size-5 text-red-500" />;
                } else if (metric.title.includes("Storage")) {
                  return <HardDrive className="size-5 text-orange-500" />;
                } else if (metric.title.includes("Active Users")) {
                  return <Users className="size-5 text-cyan-500" />;
                } else if (metric.title.includes("SSL")) {
                  return <Shield className="size-5 text-yellow-500" />;
                }
                return metric.icon;
              };
              
              return (
                <Card key={index} className="relative border-gray-600 bg-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div>
                        {getMetricIcon()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-light-100">{metric.title}</p>
                        <p
                          className={`text-lg font-bold ${getMetricStatusColor(metric.status)}`}
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
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="my-4 text-center">
        <p className="text-sm text-light-100">
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
