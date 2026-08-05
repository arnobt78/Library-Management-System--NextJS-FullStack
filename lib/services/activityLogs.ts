/**
 * Activity Logs service — pure API functions wrapping `/api/activity-logs`.
 * Parent: CR-0003 / REQ-0034
 */
import { ApiError } from "./apiError";
import type { ActivityLogPeriod, ActivityLogRow } from "@/lib/server/activityLogData";

/**
 * Client-side (serialized) shape of `ActivityLogRow` — same fields, but
 * `createdAt` crosses the JSON boundary as an ISO string instead of `Date`.
 * Aliased from the canonical server row so the two can never drift apart.
 */
export type ActivityLogItem = Omit<ActivityLogRow, "createdAt"> & {
  createdAt: string;
};

export interface ActivityLogFilters {
  period: ActivityLogPeriod;
  search?: string;
}

export async function getActivityLogs(
  filters: ActivityLogFilters,
): Promise<ActivityLogItem[]> {
  const params = new URLSearchParams({ period: filters.period });
  if (filters.search) params.set("search", filters.search);

  const response = await fetch(`/api/activity-logs?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new ApiError("Failed to fetch activity logs", response.status);
  }

  const data = await response.json();
  if (data.success && Array.isArray(data.logs)) {
    return data.logs;
  }

  throw new ApiError("Invalid response format from activity logs API", 500);
}
