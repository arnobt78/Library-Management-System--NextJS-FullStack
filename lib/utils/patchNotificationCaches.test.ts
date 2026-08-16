/**
 * Unit tests for notification densify (list + unread + total keys).
 * Parent: CR-0003 / REQ-0034
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type { NotificationItem } from "@/lib/services/notifications";
import {
  densifyNotificationBellBump,
  densifyNotificationDelete,
  densifyNotificationMarkAllRead,
  densifyNotificationMarkRead,
} from "@/lib/utils/patchNotificationCaches";

function item(
  overrides: Partial<NotificationItem> & Pick<NotificationItem, "id">,
): NotificationItem {
  return {
    type: "TICKET_CREATED",
    title: "Title",
    message: "Message",
    link: "/support-tickets",
    isRead: false,
    readAt: null,
    createdAt: "2026-08-15T12:00:00.000Z",
    ...overrides,
  };
}

describe("patchNotificationCaches", () => {
  it("densifyNotificationMarkRead marks row read and decrements unread only", () => {
    const client = new QueryClient();
    const listKey = queryKeys.notifications.list(20);
    client.setQueryData(listKey, [
      item({ id: "n1", isRead: false }),
      item({ id: "n2", isRead: true, readAt: "2026-08-14T00:00:00.000Z" }),
    ]);
    client.setQueryData(queryKeys.notifications.unreadCount, 1);
    client.setQueryData(queryKeys.notifications.totalCount, 2);

    densifyNotificationMarkRead(client, "n1");

    const next = client.getQueryData<NotificationItem[]>(listKey)!;
    expect(next.find((n) => n.id === "n1")?.isRead).toBe(true);
    expect(next.find((n) => n.id === "n1")?.readAt).toBeTruthy();
    expect(client.getQueryData(queryKeys.notifications.unreadCount)).toBe(0);
    expect(client.getQueryData(queryKeys.notifications.totalCount)).toBe(2);
  });

  it("densifyNotificationMarkAllRead zeros unread and leaves total intact", () => {
    const client = new QueryClient();
    const listKey = queryKeys.notifications.list(20);
    client.setQueryData(listKey, [
      item({ id: "n1" }),
      item({ id: "n2" }),
      item({ id: "n3", isRead: true, readAt: "2026-08-14T00:00:00.000Z" }),
    ]);
    client.setQueryData(queryKeys.notifications.unreadCount, 2);
    client.setQueryData(queryKeys.notifications.totalCount, 3);

    densifyNotificationMarkAllRead(client);

    const next = client.getQueryData<NotificationItem[]>(listKey)!;
    expect(next.every((n) => n.isRead)).toBe(true);
    expect(client.getQueryData(queryKeys.notifications.unreadCount)).toBe(0);
    expect(client.getQueryData(queryKeys.notifications.totalCount)).toBe(3);
  });

  it("densifyNotificationDelete removes row and decrements unread + total", () => {
    const client = new QueryClient();
    const listKey = queryKeys.notifications.list(20);
    client.setQueryData(listKey, [
      item({ id: "n1", isRead: false }),
      item({ id: "n2", isRead: true, readAt: "2026-08-14T00:00:00.000Z" }),
    ]);
    client.setQueryData(queryKeys.notifications.unreadCount, 1);
    client.setQueryData(queryKeys.notifications.totalCount, 2);

    densifyNotificationDelete(client, "n1");

    expect(client.getQueryData<NotificationItem[]>(listKey)).toEqual([
      item({ id: "n2", isRead: true, readAt: "2026-08-14T00:00:00.000Z" }),
    ]);
    expect(client.getQueryData(queryKeys.notifications.unreadCount)).toBe(0);
    expect(client.getQueryData(queryKeys.notifications.totalCount)).toBe(1);
  });

  it("densifyNotificationBellBump increments unread and total by send count", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.notifications.unreadCount, 2);
    client.setQueryData(queryKeys.notifications.totalCount, 5);

    densifyNotificationBellBump(client, { unreadDelta: 3 });

    expect(client.getQueryData(queryKeys.notifications.unreadCount)).toBe(5);
    expect(client.getQueryData(queryKeys.notifications.totalCount)).toBe(8);
  });

  it("densifyNotificationBellBump no-ops on non-positive count", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.notifications.unreadCount, 1);
    densifyNotificationBellBump(client, { unreadDelta: 0 });
    expect(client.getQueryData(queryKeys.notifications.unreadCount)).toBe(1);
  });

  it("densifyNotificationDelete of a read row decrements total only", () => {
    const client = new QueryClient();
    const listKey = queryKeys.notifications.list(20);
    client.setQueryData(listKey, [
      item({ id: "n1", isRead: true, readAt: "2026-08-14T00:00:00.000Z" }),
    ]);
    client.setQueryData(queryKeys.notifications.unreadCount, 0);
    client.setQueryData(queryKeys.notifications.totalCount, 1);

    densifyNotificationDelete(client, "n1");

    expect(client.getQueryData<NotificationItem[]>(listKey)).toEqual([]);
    expect(client.getQueryData(queryKeys.notifications.unreadCount)).toBe(0);
    expect(client.getQueryData(queryKeys.notifications.totalCount)).toBe(0);
  });
});
