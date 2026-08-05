/**
 * Notifications Service - Pure API Functions (client fetch wrappers)
 * Parent: CR-0003 / REQ-0034
 *
 * No React Query logic here — see hooks/useQueries.ts + hooks/useMutations.ts.
 */
import { ApiError } from "./apiError";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsListResponse {
  success: boolean;
  notifications: NotificationItem[];
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }
  return response.json();
}

/** Most recent notifications for the signed-in user (default 20). */
export async function getNotifications(
  limit: number = 20,
): Promise<NotificationItem[]> {
  const response = await fetch(`/api/notifications?limit=${limit}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await parseJsonOrThrow<NotificationsListResponse>(response);
  return data.notifications ?? [];
}

/** Unread notification count for the bell badge. */
export async function getUnreadNotificationCount(): Promise<number> {
  const response = await fetch("/api/notifications/unread-count", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await parseJsonOrThrow<{ success: boolean; count: number }>(
    response,
  );
  return data.count ?? 0;
}

/** Mark a single notification as read. */
export async function markNotificationRead(id: string): Promise<void> {
  const response = await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
  await parseJsonOrThrow<{ success: boolean }>(response);
}

/** Delete a single notification. */
export async function deleteNotification(id: string): Promise<void> {
  const response = await fetch(`/api/notifications/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  await parseJsonOrThrow<{ success: boolean }>(response);
}

/** Mark every notification for the signed-in user as read. */
export async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch("/api/notifications/mark-all-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  await parseJsonOrThrow<{ success: boolean }>(response);
}
