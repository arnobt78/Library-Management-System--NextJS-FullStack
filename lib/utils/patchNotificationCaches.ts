/**
 * Post-invalidate densify for notification.write — re-apply optimistic paints
 * so registry=required stays honest after invalidateMutation.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { NotificationItem } from "@/lib/services/notifications";
import { markDensifiedEmpty } from "@/lib/utils/queryCacheLists";

/** Re-mark a notification as read + adjust unread count if needed. */
export function densifyNotificationMarkRead(
  queryClient: QueryClient,
  id: string,
): void {
  let wasUnread = false;
  queryClient.setQueriesData<NotificationItem[]>(
    { queryKey: queryKeys.notifications.root },
    (old) =>
      old?.map((n) => {
        if (n.id !== id) return n;
        wasUnread = !n.isRead;
        return {
          ...n,
          isRead: true,
          readAt: n.readAt ?? new Date().toISOString(),
        };
      }),
  );
  if (wasUnread) {
    queryClient.setQueryData<number>(
      queryKeys.notifications.unreadCount,
      (old) => Math.max(0, (old ?? 1) - 1),
    );
  }
}

/** Mark all notifications read + zero unread badge. */
export function densifyNotificationMarkAllRead(
  queryClient: QueryClient,
): void {
  queryClient.setQueriesData<NotificationItem[]>(
    { queryKey: queryKeys.notifications.root },
    (old) =>
      old?.map((n) =>
        n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() },
      ),
  );
  queryClient.setQueryData<number>(queryKeys.notifications.unreadCount, 0);
}

/** Remove a notification from lists; decrement unread if it was unread. */
export function densifyNotificationDelete(
  queryClient: QueryClient,
  id: string,
): void {
  let wasUnread = false;
  queryClient.setQueriesData<NotificationItem[]>(
    { queryKey: queryKeys.notifications.root },
    (old) => {
      if (!old) return old;
      const hit = old.find((n) => n.id === id);
      if (hit && !hit.isRead) wasUnread = true;
      return old.filter((n) => n.id !== id);
    },
  );
  // Last notification deleted → mark intentional [] (soft-nav SSR reseed guard).
  for (const [key, rows] of queryClient.getQueriesData<NotificationItem[]>({
    queryKey: queryKeys.notifications.root,
  })) {
    if (Array.isArray(rows) && rows.length === 0) {
      markDensifiedEmpty(key);
    }
  }
  if (wasUnread) {
    queryClient.setQueryData<number>(
      queryKeys.notifications.unreadCount,
      (old) => Math.max(0, (old ?? 1) - 1),
    );
  }
}
